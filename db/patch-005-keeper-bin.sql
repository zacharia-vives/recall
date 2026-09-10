-- Patch 005. Letting the keeper put her own card in the bin.
--
-- The bug: index.html has a "Delete this card" button on the card screen, and
-- it only ever deleted the card from the phone. The row in the database was
-- never touched, so the next sync downloaded it again and the card came back.
-- Wiring that button to the existing bin call does not fix it either, because
-- the only update policy on records is "helpers change records", so the
-- keeper's update is refused. The bin could never have worked for her.
--
-- Why a function and not a policy. An RLS update policy cannot say which
-- columns may change, so "let the keeper update records" would also let her
-- rewrite the title, the date and the spoken text of anything in the
-- household. Binning is one column, so it gets one function that sets that
-- column and nothing else, and the policy stays as it was.
--
-- R5.7 still holds: nothing is deleted here. A card goes to the bin by
-- setting deleted_at, it stays visible to helpers for thirty days, and it can
-- be taken back out.
--
-- Wrapped in a transaction so a failure leaves nothing half applied.

begin;
-- ---------------------------------------------------------------- binning
create or replace function public.bin_record(p_record uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select household_id into v_household
    from public.records where id = p_record;

  if v_household is null then
    raise exception 'no such card';
  end if;

  -- Either role, but only inside their own household. is_member is the same
  -- check the read policy uses, so this grants nothing new about who can see
  -- what: it only adds what they can do to a card they can already read.
  if not public.is_member(v_household) then
    raise exception 'not your household';
  end if;

  update public.records
     set deleted_at = now()
   where id = p_record
     and deleted_at is null;

  -- 'deleted' and 'restored' are the words the activity table already
  -- allows. It has a check constraint, so inventing a new action name
  -- here would make the whole function throw.
  insert into public.activity (household_id, actor_id, action, record_id,
                               detail)
  values (v_household, auth.uid(), 'deleted', p_record,
          'moved to the bin');
end;
$$;

-- ------------------------------------------------------------- restoring
create or replace function public.restore_record(p_record uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
begin
  select household_id into v_household
    from public.records where id = p_record;

  if v_household is null then
    raise exception 'no such card';
  end if;

  if not public.is_member(v_household) then
    raise exception 'not your household';
  end if;

  update public.records
     set deleted_at = null
   where id = p_record;

  insert into public.activity (household_id, actor_id, action, record_id,
                               detail)
  values (v_household, auth.uid(), 'restored', p_record,
          'taken back out of the bin');
end;
$$;

-- Postgres grants execute on a new function to PUBLIC. Patch 004 was written
-- believing otherwise, and it meant anybody holding the anon key could call
-- the internals. Revoke first, then grant to the one role that should have it.
revoke execute on function public.bin_record(uuid) from public, anon;
revoke execute on function public.restore_record(uuid) from public, anon;
grant execute on function public.bin_record(uuid) to authenticated;
grant execute on function public.restore_record(uuid) to authenticated;

-- ------------------------------------------------------------------ checks
do $$
declare
  v_bad int;
begin
  -- Both functions exist and are definers.
  select count(*) into v_bad
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('bin_record', 'restore_record')
     and p.prosecdef;
  raise notice 'definer functions present: % of 2', v_bad;

  -- The records update policy is untouched: still helpers only.
  select count(*) into v_bad
    from pg_policies
   where schemaname = 'public' and tablename = 'records' and cmd = 'UPDATE';
  raise notice 'update policies on records: % (expected 1, helpers only)', v_bad;
end;
$$;

-- Who may run what, printed rather than assumed.
select p.proname,
       coalesce(has_function_privilege('anon', p.oid, 'execute'), false) as anon,
       coalesce(has_function_privilege('authenticated', p.oid, 'execute'), false) as signed_in
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('bin_record', 'restore_record')
 order by p.proname;

commit;
