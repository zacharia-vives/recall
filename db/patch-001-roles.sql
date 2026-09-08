-- Recall, patch 001. Run this once in the Supabase SQL editor.
--
-- Two problems found during testing on 8 September 2026, plus a recovery step.
--
-- 1. claim_keeper_device would happily turn a helper into a keeper. If somebody
--    typed the link code in the same browser where they were signed in as the
--    helper, the on conflict clause demoted their own account, and they quietly
--    lost the right to edit cards, invite people or use the bin.
--
-- 2. The memberships update policy allowed a member to change any column of
--    their own row, including the role. So a keeper device could promote itself
--    to helper. A policy cannot compare against the old row, so this needs a
--    trigger.
--
-- 3. Recovery: put the creator of each household back to helper, in case the
--    demotion already happened.

-- ---------------------------------------------------------------- 1. claiming

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

  -- A helper must never be turned into a keeper by typing a code. Linking is
  -- meant to happen on the phone of the person who forgets, in a browser that
  -- is not signed in as family.
  if public.is_helper(link.household_id) then
    raise exception 'this account already helps in this household, so it cannot become the keeper phone. Sign out here first, or use her own phone';
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

-- ------------------------------------------------------- 2. no self promotion

create or replace function public.guard_membership_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = old.role then
    return new;
  end if;

  -- Every request through the API carries JWT claims, the anonymous ones
  -- included. The SQL editor and a migration carry none, and those are us. If
  -- the check did not look at this, the recovery statement at the bottom of
  -- patch 001 would be refused by this very trigger, and so would any repair
  -- by hand later on.
  if coalesce(current_setting('request.jwt.claims', true), '') = '' then
    return new;
  end if;

  if not public.is_helper(old.household_id) then
    raise exception 'only a helper can change a role in this household';
  end if;
  return new;
end;
$$;

-- --------------------------------------------------------------- 3. recovery
-- Whoever created a household is its helper. If a demotion already happened,
-- this puts it back. Safe to run more than once.

update public.memberships m
set role = 'helper'
from public.households h
where m.household_id = h.id
  and m.user_id = h.created_by
  and m.role <> 'helper';

-- ------------------------------------------- 4. and now the trigger itself

drop trigger if exists memberships_guard_role on public.memberships;
create trigger memberships_guard_role
  before update on public.memberships
  for each row execute function public.guard_membership_role();
