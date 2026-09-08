-- Recall, database schema version 2.
--
-- Run this once in the Supabase SQL editor of a project in the Frankfurt
-- region. Nothing here is used while the keeper app runs local only, which is
-- still the default.
--
-- The model: a record belongs to a household, not to a person. People belong to
-- a household with a role, either keeper or helper. Every policy checks
-- membership in the database, never in the browser.
--
-- Requirements: R6.1, R6.2, P5, P6, P17, P18, P19.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- tables

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  created_by  uuid not null references auth.users (id) on delete restrict,
  created_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null check (role in ('keeper', 'helper')),
  display_name  text default '',
  invited_by    uuid references auth.users (id) on delete set null,
  accepted_at   timestamptz not null default now(),
  unique (household_id, user_id)
);

create index if not exists memberships_user_idx on public.memberships (user_id);

-- R6.3, R6.4. A short code the helper reads out on their own phone and types
-- into the keeper phone once. The keeper phone then signs in anonymously and
-- claims the code, so the keeper gets a lasting identity with no email and no
-- password, and never sees a login screen again.
create table if not exists public.device_links (
  code          text primary key,
  household_id  uuid not null references public.households (id) on delete cascade,
  created_by    uuid not null references auth.users (id) on delete cascade,
  display_name  text default 'the keeper',
  expires_at    timestamptz not null,
  used_at       timestamptz,
  used_by       uuid references auth.users (id) on delete set null
);

-- R6.5
create table if not exists public.invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  email         text not null,
  token         text not null unique,
  invited_by    uuid not null references auth.users (id) on delete cascade,
  expires_at    timestamptz not null,
  accepted_at   timestamptz
);

create table if not exists public.records (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  created_by    uuid references auth.users (id) on delete set null,
  kind          text not null check (kind in ('person', 'letter', 'place')),
  title         text not null check (char_length(title) between 1 and 200),
  people        text[] not null default '{}',
  place         text default '',
  happens_at    timestamptz,
  tags          text[] not null default '{}',
  photo_path    text,
  ocr_text      text default '',
  spoken_text   text default '',
  deleted_at    timestamptz,                     -- R5.7, the 30 day bin
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists records_household_idx
  on public.records (household_id, created_at desc);

create table if not exists public.reminders (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references public.records (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  due_at        timestamptz not null,
  repeat        text not null default 'none'
                check (repeat in ('none', 'daily', 'twice_daily', 'weekly')),
  spoken_text   text default '',
  done_at       timestamptz,
  done_by       uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists reminders_household_due_idx
  on public.reminders (household_id, due_at);

-- P18. What the keeper is allowed to know about us. Deliberately not a log of
-- what the keeper does: see P15 and P16, we do not collect that.
create table if not exists public.activity (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  actor_id      uuid references auth.users (id) on delete set null,
  actor_name    text default '',
  action        text not null check (action in
                ('added', 'edited', 'deleted', 'restored', 'invited',
                 'removed', 'linked', 'unlinked', 'reminder_set', 'marked_done')),
  record_id     uuid,
  detail        text default '',
  at            timestamptz not null default now()
);

create index if not exists activity_household_idx on public.activity (household_id, at desc);

-- P19
create table if not exists public.consents (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  notice_version  text not null,
  given_at        timestamptz not null default now(),
  withdrawn_at    timestamptz,
  explained_by    uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------- helpers
-- These run as the definer so a policy on memberships does not have to query
-- memberships through its own policy and recurse.

create or replace function public.is_member(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.household_id = hh and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_helper(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.household_id = hh and m.user_id = auth.uid() and m.role = 'helper'
  );
$$;

create or replace function public.my_role(hh uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.memberships m
  where m.household_id = hh and m.user_id = auth.uid()
  limit 1;
$$;

-- Creating a household and its first membership in one go, so the insert policy
-- on memberships can stay strict.
create or replace function public.create_household(household_name text, helper_name text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  insert into public.households (name, created_by)
  values (household_name, auth.uid())
  returning id into new_id;

  insert into public.memberships (household_id, user_id, role, display_name)
  values (new_id, auth.uid(), 'helper', coalesce(nullif(helper_name, ''), 'helper'));

  return new_id;
end;
$$;

-- R6.3. Called by the keeper phone right after an anonymous sign in.
create or replace function public.claim_keeper_device(link_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.device_links;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into link from public.device_links
  where code = upper(link_code) and used_at is null and expires_at > now();

  if link is null then
    raise exception 'this code is not valid any more';
  end if;

  insert into public.memberships (household_id, user_id, role, display_name, invited_by)
  values (link.household_id, auth.uid(), 'keeper', link.display_name, link.created_by)
  on conflict (household_id, user_id) do update set role = 'keeper';

  update public.device_links
  set used_at = now(), used_by = auth.uid()
  where code = link.code;

  insert into public.activity (household_id, actor_id, action, detail)
  values (link.household_id, auth.uid(), 'linked', 'a phone was linked as the keeper phone');

  return link.household_id;
end;
$$;

-- R6.5, accepting an emailed invite.
create or replace function public.accept_invite(invite_token text, helper_name text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into inv from public.invites
  where token = invite_token and accepted_at is null and expires_at > now();

  if inv is null then
    raise exception 'this invitation is not valid any more';
  end if;

  insert into public.memberships (household_id, user_id, role, display_name, invited_by)
  values (inv.household_id, auth.uid(), 'helper',
          coalesce(nullif(helper_name, ''), inv.email), inv.invited_by)
  on conflict (household_id, user_id) do nothing;

  update public.invites set accepted_at = now() where id = inv.id;

  insert into public.activity (household_id, actor_id, action, detail)
  values (inv.household_id, auth.uid(), 'invited', inv.email || ' accepted the invitation');

  return inv.household_id;
end;
$$;

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before update on public.records
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- policies

alter table public.households  enable row level security;
alter table public.memberships enable row level security;
alter table public.device_links enable row level security;
alter table public.invites     enable row level security;
alter table public.records     enable row level security;
alter table public.reminders   enable row level security;
alter table public.activity    enable row level security;
alter table public.consents    enable row level security;

-- households
drop policy if exists "members see their household" on public.households;
create policy "members see their household" on public.households
  for select using (public.is_member(id));

drop policy if exists "helpers rename their household" on public.households;
create policy "helpers rename their household" on public.households
  for update using (public.is_helper(id)) with check (public.is_helper(id));

drop policy if exists "the creator deletes the household" on public.households;
create policy "the creator deletes the household" on public.households
  for delete using (created_by = auth.uid());

-- memberships. Everyone in the household sees who else is in it, which is
-- requirement P12: the keeper must be able to read the names.
drop policy if exists "members see each other" on public.memberships;
create policy "members see each other" on public.memberships
  for select using (public.is_member(household_id));

drop policy if exists "helpers add members" on public.memberships;
create policy "helpers add members" on public.memberships
  for insert with check (public.is_helper(household_id));

drop policy if exists "helpers remove members" on public.memberships;
create policy "helpers remove members" on public.memberships
  for delete using (public.is_helper(household_id));

drop policy if exists "you can rename yourself" on public.memberships;
create policy "you can rename yourself" on public.memberships
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- device links. Only helpers make them. Nobody needs to read them back except
-- the claim function, which runs as the definer.
drop policy if exists "helpers create device links" on public.device_links;
create policy "helpers create device links" on public.device_links
  for insert with check (public.is_helper(household_id) and created_by = auth.uid());

drop policy if exists "helpers see their device links" on public.device_links;
create policy "helpers see their device links" on public.device_links
  for select using (public.is_helper(household_id));

-- invites
drop policy if exists "helpers manage invites" on public.invites;
create policy "helpers manage invites" on public.invites
  for all using (public.is_helper(household_id))
  with check (public.is_helper(household_id) and invited_by = auth.uid());

-- records. Both roles read, both roles add, only helpers change or bin.
drop policy if exists "members read records" on public.records;
create policy "members read records" on public.records
  for select using (public.is_member(household_id));

drop policy if exists "members add records" on public.records;
create policy "members add records" on public.records
  for insert with check (public.is_member(household_id) and created_by = auth.uid());

drop policy if exists "helpers change records" on public.records;
create policy "helpers change records" on public.records
  for update using (public.is_helper(household_id))
  with check (public.is_helper(household_id));

-- No delete policy on purpose. R5.7: a card goes to the bin by setting
-- deleted_at, and a scheduled job can clear the bin after thirty days.

-- reminders. Helpers set them, both roles may mark one done (R3.4).
drop policy if exists "members read reminders" on public.reminders;
create policy "members read reminders" on public.reminders
  for select using (public.is_member(household_id));

drop policy if exists "helpers set reminders" on public.reminders;
create policy "helpers set reminders" on public.reminders
  for insert with check (public.is_helper(household_id));

drop policy if exists "members update reminders" on public.reminders;
create policy "members update reminders" on public.reminders
  for update using (public.is_member(household_id))
  with check (public.is_member(household_id));

drop policy if exists "helpers remove reminders" on public.reminders;
create policy "helpers remove reminders" on public.reminders
  for delete using (public.is_helper(household_id));

-- activity. Everyone in the household reads it, including the keeper, and
-- nobody can edit or erase it.
drop policy if exists "members read the activity log" on public.activity;
create policy "members read the activity log" on public.activity
  for select using (public.is_member(household_id));

drop policy if exists "members write the activity log" on public.activity;
create policy "members write the activity log" on public.activity
  for insert with check (public.is_member(household_id) and actor_id = auth.uid());

-- consents
drop policy if exists "members read consent" on public.consents;
create policy "members read consent" on public.consents
  for select using (public.is_member(household_id));

drop policy if exists "helpers record consent" on public.consents;
create policy "helpers record consent" on public.consents
  for insert with check (public.is_helper(household_id));

drop policy if exists "members withdraw consent" on public.consents;
create policy "members withdraw consent" on public.consents
  for update using (public.is_member(household_id))
  with check (public.is_member(household_id));

-- ---------------------------------------------------------------- storage
-- Create the bucket private, and keep photos at photos/<household>/<record>.jpg
-- so the first folder is the household the policies check.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "household photos readable" on storage.objects;
create policy "household photos readable" on storage.objects
  for select using (
    bucket_id = 'photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household photos writable" on storage.objects;
create policy "household photos writable" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household photos removable" on storage.objects;
create policy "household photos removable" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and public.is_helper(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------- after this
-- 1. Authentication, Providers: switch on "Anonymous sign-ins". The keeper
--    phone needs it, and nothing else does.
-- 2. Authentication, URL configuration: add the site url
--    https://zacharia-vives.github.io/recall/ and the redirect
--    https://zacharia-vives.github.io/recall/helper.html
-- 3. Storage: check that the photos bucket says private.
-- 4. Put the project url and the anon key in js/config.js. The anon key is
--    meant to be public. The service_role key is not, and we never use it.
