-- Recall, patch 004: an API for other systems to talk to. Run once in the
-- Supabase SQL editor. Safe to run more than once.
--
-- Why this exists. The business plan sells a licence to care organisations, and
-- an organisation that already runs a scheduling system is not going to retype
-- appointments into a family app by hand. So there has to be a way for their
-- software to put a card in a household and set a reminder on it.
--
-- Three rules shaped every line below.
--
--   1. A key reaches exactly one household. There is no key that can see
--      everything, because that is the key somebody eventually leaks.
--   2. Everything a partner does is written into the same activity log the
--      keeper reads. Machines get no privacy she does not get: if their
--      software adds a card, she can see that their software added a card.
--   3. **A partner cannot write to a household that has withdrawn consent.**
--      The consent screen is not decoration and it is not only about our own
--      app. Stopping sharing stops everybody.
--
-- Deliberately not exposed in this version: photos, the documents on cards,
-- deleting anything, and reading a card's contents. A scheduling system needs
-- to put appointments in and see what is coming. It has no business reading her
-- hospital letters, so it cannot.
--
-- No extensions are needed. sha256() and gen_random_uuid() are both built in.

/* ------------------------------------------------------------------ keys */

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 80),
  -- The first characters, kept in the clear so a key can be recognised in a
  -- list without ever storing the key itself.
  key_prefix    text not null,
  -- sha256 of the whole key. A leaked database does not leak working keys.
  key_hash      text not null unique,
  scopes        text[] not null default '{read}',
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  calls         bigint not null default 0,
  revoked_at    timestamptz
);

create index if not exists api_keys_household_idx on public.api_keys (household_id);
create index if not exists api_keys_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- The family can see which keys exist for their household and revoke them.
-- Nobody can read a key back, because nothing stores one.
-- Asking first instead of dropping first. "drop policy if exists" would be
-- shorter, but the Supabase SQL editor counts any drop as a destructive
-- operation and puts a confirmation in front of the whole script, so a patch
-- written that way is annoying to run and easy to half run.
do $$
begin
  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relname = 'api_keys' and p.polname = 'members read api keys'
  ) then
    create policy "members read api keys" on public.api_keys
      for select using (public.is_member(household_id));
  end if;

  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relname = 'api_keys' and p.polname = 'helpers revoke api keys'
  ) then
    create policy "helpers revoke api keys" on public.api_keys
      for update using (public.is_helper(household_id))
      with check (public.is_helper(household_id));
  end if;
end $$;

-- Creating one goes through the function below, never by a direct insert, so
-- there is exactly one place that decides what a key looks like.

/* -------------------------------------------------------------- the guard */

-- Sixty four hex characters of randomness, from two uuids, so no extension is
-- needed to make a key.
create or replace function public.api_new_secret()
returns text
language sql
volatile
as $$
  select 'rk_' ||
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function public.api_hash(secret text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(coalesce(secret, ''), 'utf8')), 'hex');
$$;

-- A helper makes a key for their own household and is shown it exactly once.
-- Storing it is their problem, which is the only honest way to do this.
create or replace function public.api_create_key(
  household uuid,
  label text,
  scopes text[] default array['read']
)
returns table (secret text, prefix text, id uuid)
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  fresh text;
  made uuid;
begin
  if not public.is_helper(household) then
    raise exception 'only a helper of this household can make a key';
  end if;
  if not (scopes <@ array['read', 'write']) then
    raise exception 'a key can only ask for read and write';
  end if;

  fresh := public.api_new_secret();
  insert into public.api_keys (household_id, label, key_prefix, key_hash, scopes, created_by)
  values (household, label, left(fresh, 11), public.api_hash(fresh), scopes, auth.uid())
  returning api_keys.id into made;

  perform public.log_api_use(household, 'invited', null,
    'an api key was made: ' || label);

  return query select fresh, left(fresh, 11), made;
end;
$$;

-- Everything a partner does lands in the same list the keeper reads. The
-- activity table only allows a fixed set of actions, so this maps onto those
-- rather than inventing new ones she would not recognise.
create or replace function public.log_api_use(
  household uuid,
  action text,
  record uuid,
  detail text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity (household_id, actor_id, actor_name, action, record_id, detail)
  values (household, null, 'a connected system', action, record, detail);
end;
$$;

-- The one place that decides whether a call is allowed. Every function below
-- starts here, and it is the only thing that ever looks at a key.
create or replace function public.api_household(secret text, needs text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  row_found public.api_keys;
  consent_ok boolean;
begin
  select * into row_found
  from public.api_keys
  where key_hash = public.api_hash(secret)
  limit 1;

  if row_found.id is null then
    raise exception 'that key is not known';
  end if;
  if row_found.revoked_at is not null then
    raise exception 'that key was revoked';
  end if;
  if not (needs = any (row_found.scopes)) then
    raise exception 'that key may not %', needs;
  end if;

  -- Rule three. A household that stopped sharing stops sharing with
  -- everybody, including software that was invited in earlier.
  if needs = 'write' then
    select (c.id is not null and c.withdrawn_at is null) into consent_ok
    from public.consents c
    where c.household_id = row_found.household_id
    order by c.given_at desc
    limit 1;

    if consent_ok is not true then
      raise exception 'this household has not agreed to sharing, or has stopped';
    end if;
  end if;

  update public.api_keys
  set last_used_at = now(), calls = calls + 1
  where id = row_found.id;

  return row_found.household_id;
end;
$$;

/* ------------------------------------------------------- what a partner can do */

-- A health check, so an integrator can prove their key works before writing
-- anything. Says what the key may do and nothing about the person.
create or replace function public.api_ping(secret text)
returns json
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  household uuid;
  house_name text;
  key_scopes text[];
begin
  household := public.api_household(secret, 'read');
  select h.name into house_name from public.households h where h.id = household;
  select k.scopes into key_scopes from public.api_keys k
  where k.key_hash = public.api_hash(secret) limit 1;
  return json_build_object(
    'ok', true,
    'household', house_name,
    'scopes', key_scopes,
    'can_write', 'write' = any (key_scopes)
  );
end;
$$;

-- Put an appointment in. Everything is optional except a title, because a
-- scheduling system that only knows "physiotherapy, Tuesday" should still be
-- able to say so.
create or replace function public.api_add_card(
  secret text,
  title text,
  kind text default 'letter',
  happens_at timestamptz default null,
  place text default '',
  people text[] default '{}',
  spoken_text text default '',
  phone text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  household uuid;
  made uuid;
begin
  household := public.api_household(secret, 'write');
  if coalesce(trim(title), '') = '' then
    raise exception 'a card needs a title';
  end if;
  if kind not in ('person', 'letter', 'place', 'list') then
    raise exception 'kind must be person, letter, place or list';
  end if;

  insert into public.records
    (household_id, created_by, kind, title, people, place, happens_at, spoken_text, phone)
  values
    (household, null, kind, left(title, 200), people, coalesce(place, ''),
     happens_at, coalesce(spoken_text, ''), coalesce(phone, ''))
  returning id into made;

  perform public.log_api_use(household, 'added', made, title);
  return json_build_object('ok', true, 'card', made);
end;
$$;

create or replace function public.api_set_reminder(
  secret text,
  card uuid,
  due_at timestamptz,
  repeat text default 'none',
  kind text default 'normal',
  spoken_text text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  household uuid;
  made uuid;
begin
  household := public.api_household(secret, 'write');

  -- The card has to be in the same household as the key. Without this a
  -- partner could hang a reminder on somebody else's card.
  if not exists (
    select 1 from public.records r
    where r.id = card and r.household_id = household and r.deleted_at is null
  ) then
    raise exception 'no such card in this household';
  end if;
  if repeat not in ('none', 'daily', 'twice_daily', 'weekly') then
    raise exception 'repeat must be none, daily, twice_daily or weekly';
  end if;
  if kind not in ('normal', 'call') then
    raise exception 'kind must be normal or call';
  end if;

  insert into public.reminders
    (record_id, household_id, due_at, repeat, kind, spoken_text)
  values (card, household, due_at, repeat, kind, coalesce(spoken_text, ''))
  returning id into made;

  perform public.log_api_use(household, 'reminder_set', card, 'a reminder was set');
  return json_build_object('ok', true, 'reminder', made);
end;
$$;

-- What is coming, so a partner can show it in their own screen or check that
-- something they set is really there. Titles and times, never the contents of
-- a letter and never a photo.
create or replace function public.api_upcoming(secret text, days int default 7)
returns json
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  household uuid;
  found json;
begin
  household := public.api_household(secret, 'read');
  select coalesce(json_agg(item), '[]'::json) into found
  from (
    select
      rem.id as reminder,
      rec.id as card,
      rec.title,
      rem.due_at,
      rem.repeat,
      rem.kind,
      (rem.done_at is not null) as done
    from public.reminders rem
    join public.records rec on rec.id = rem.record_id
    where rem.household_id = household
      and rec.deleted_at is null
      and rem.due_at < now() + make_interval(days => greatest(1, least(days, 60)))
    order by rem.due_at
    limit 200
  ) item;
  return json_build_object('ok', true, 'upcoming', found);
end;
$$;

create or replace function public.api_mark_done(secret text, reminder uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
-- Parameters here are named after the columns they fill, which is right for a
-- documented API and ambiguous inside an insert. This says the parameter wins.
#variable_conflict use_variable
declare
  household uuid;
  card uuid;
begin
  household := public.api_household(secret, 'write');
  select record_id into card from public.reminders
  where id = reminder and household_id = household;
  if card is null then
    raise exception 'no such reminder in this household';
  end if;

  update public.reminders set done_at = now() where id = reminder;
  perform public.log_api_use(household, 'marked_done', card, 'marked as done');
  return json_build_object('ok', true);
end;
$$;

/* ----------------------------------------------------------------- access */

-- The machine facing functions are callable without a session, because a
-- partner's server has no session: the key in the argument is the credential.
-- Everything they can reach is decided inside api_household.
grant execute on function public.api_ping(text) to anon, authenticated;
grant execute on function public.api_add_card(text, text, text, timestamptz, text, text[], text, text) to anon, authenticated;
grant execute on function public.api_set_reminder(text, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.api_upcoming(text, int) to anon, authenticated;
grant execute on function public.api_mark_done(text, uuid) to anon, authenticated;

-- Making a key needs a signed in helper, so this one is not for anon.
revoke execute on function public.api_create_key(uuid, text, text[]) from public, anon;
grant execute on function public.api_create_key(uuid, text, text[]) to authenticated;

-- The internals are not part of the surface, and revoking "from public" is the
-- line that does the work. Postgres grants execute on a new function to PUBLIC
-- by default, so revoking only from anon and authenticated leaves it open: the
-- first run of this patch did exactly that, and log_api_use was reachable by
-- anybody with the anon key, meaning a stranger who knew a household id could
-- write a line into the activity log the keeper trusts. Found by probing the
-- functions from outside after applying the patch, which is the only way it
-- would ever have shown up.
revoke execute on function public.api_household(text, text) from public, anon, authenticated;
revoke execute on function public.log_api_use(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.api_new_secret() from public, anon, authenticated;
revoke execute on function public.api_hash(text) from public, anon, authenticated;

/* ------------------------------------------------------------------ check */

-- Not just "does it exist" but "who may run it". Anything in this list that
-- says "default (public can execute)" is a hole.
select p.proname as name,
  coalesce(array_to_string(p.proacl, '  '), 'default (public can execute)') as who_may_run
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'api_%' or p.proname = 'log_api_use')
order by p.proname;
