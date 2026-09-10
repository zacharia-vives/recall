-- Patch 007. Making the consent row hers rather than her family's.
--
-- NOT YET APPLIED. Read the whole of this before running it, because it must
-- go out together with a one line change in js/helper.js and neither half
-- works alone.
--
-- The finding. The family app records a consent row the moment a household is
-- created (js/helper.js, in the create-household handler). Since patch 006 the
-- gate reads the newest consent row, so from that moment consent "stands" and
-- the family can read and write her cards. The keeper's own spoken consent
-- screen later writes a second, newer row.
--
-- So the sequence today is: the family agrees on her behalf at setup, and she
-- is asked afterwards. Everything downstream still works, and withdrawal still
-- works, because withdrawal marks the newest row. But the presentation says
-- "the family cannot consent for her, it is recorded against her phone", and
-- that is not true as the code stands. This patch makes it true.
--
-- Why the row is there at all. Before patch 006, consent gated nothing, so the
-- row was only a record and writing it early was harmless. Patch 006 turned it
-- into the thing that authorises the family's own writes, which means removing
-- it naively locks the family out of a household they have just made: they
-- cannot add the first card, and they cannot link her phone without a
-- household to link it to. That is the deadlock this patch removes.
--
-- The rule. Consent is only meaningful once there is somebody to give it. So:
-- while a household has no keeper, a helper may work in it; the moment a
-- keeper is linked, her consent governs, and nothing the family did earlier
-- counts as her saying yes.
--
-- What this is not. It is not a loophole. A household with no keeper contains
-- only what the family typed themselves, and the moment a keeper exists the
-- gate closes until she answers. There is no state in which the family reads
-- data belonging to a keeper who has not consented.
--
-- Safe to run more than once.

begin;

-- ------------------------------------------------------- is there a keeper yet
create or replace function public.has_keeper(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
     where m.household_id = hh and m.role = 'keeper'
  );
$$;

revoke execute on function public.has_keeper(uuid) from public, anon;
grant execute on function public.has_keeper(uuid) to authenticated;

-- --------------------------------------------------------------- the new gate
-- The keeper always. A helper while her consent stands, or while there is no
-- keeper yet to have an opinion.
create or replace function public.may_see_cards(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_keeper(hh)
      or (public.is_helper(hh)
          and (public.has_consent(hh) or not public.has_keeper(hh)));
$$;

-- The three write policies patch 006 gated on has_consent directly get the
-- same treatment, or a family still cannot set a reminder before the phone is
-- linked.
drop policy if exists "helpers change records" on public.records;
create policy "helpers change records" on public.records
  for update using (
    public.is_helper(household_id)
    and (public.has_consent(household_id) or not public.has_keeper(household_id))
  )
  with check (
    public.is_helper(household_id)
    and (public.has_consent(household_id) or not public.has_keeper(household_id))
  );

drop policy if exists "helpers set reminders" on public.reminders;
create policy "helpers set reminders" on public.reminders
  for insert with check (
    public.is_helper(household_id)
    and (public.has_consent(household_id) or not public.has_keeper(household_id))
  );

drop policy if exists "helpers remove reminders" on public.reminders;
create policy "helpers remove reminders" on public.reminders
  for delete using (
    public.is_helper(household_id)
    and (public.has_consent(household_id) or not public.has_keeper(household_id))
  );

-- ------------------------------------------------------------------ checks
do $$
declare
  v_n int;
begin
  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'has_keeper';
  raise notice 'has_keeper present: %', v_n;
end;
$$;

select p.proname,
       coalesce(has_function_privilege('anon', p.oid, 'execute'), false) as anon,
       coalesce(has_function_privilege('authenticated', p.oid, 'execute'), false) as signed_in
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('has_keeper', 'may_see_cards')
 order by p.proname;

commit;

-- ---------------------------------------------------------------- after this
-- Once this has run and the checks above look right, delete this line from
-- js/helper.js, in the create-household handler:
--
--     await cloud.recordConsent(id, NOTICE_VERSION);
--
-- After that the only consent row in the system is the one her own phone
-- writes, in the language she heard it in, which is what the presentation
-- says. Until this patch is applied that line must stay, or the family app
-- cannot add a card to a household it has just created.
