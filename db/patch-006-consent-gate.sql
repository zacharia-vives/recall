-- Patch 006. Making withdrawal of consent actually stop the sharing.
--
-- The bug is a legal one, not a broken button. withdrawConsent stamped
-- withdrawn_at on the consent row and wrote a line in the activity log, and
-- that was the whole of it. Nothing read that column. is_helper() is true for
-- anybody with a helper membership, so after she withdrew her consent the
-- family could still read every card, every reminder, every letter Recall had
-- read aloud and every photograph. The withdrawal was a note in a table.
--
-- Article 7(3) says it has to be as easy to take back as it was to give, and
-- that taking it back stops the processing. A row that records a wish is not
-- the same as a rule that enforces it, so the rule goes here, in the database,
-- next to the data.
--
-- What changes: a helper reads and writes the keeper's cards, reminders and
-- log only while her consent stands. What does not change: the keeper always
-- reaches her own data, because it is hers and it is on her phone; and a
-- helper can always still read the household, the memberships and the consent
-- rows, because otherwise the family could not be told why the screen is
-- empty, or offer to ask her again.
--
-- Safe to run more than once.
--
-- Wrapped in a transaction. This one drops and recreates the policies that
-- guard her cards, so a script that failed in the middle could leave a
-- table with no policy at all. All or nothing.

begin;
-- ------------------------------------------------------- who is who, and when
create or replace function public.is_keeper(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.household_id = hh and m.user_id = auth.uid() and m.role = 'keeper'
  );
$$;

-- The latest word on it. Consent rows are only ever inserted, and updated the
-- once to mark a withdrawal, so the newest row by given_at is the standing
-- answer. No row at all means no consent: a household that has never been
-- asked is not a household that said yes.
create or replace function public.has_consent(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select c.withdrawn_at is null
      from public.consents c
     where c.household_id = hh
     order by c.given_at desc
     limit 1
  ), false);
$$;

revoke execute on function public.is_keeper(uuid) from public, anon;
revoke execute on function public.has_consent(uuid) from public, anon;
grant execute on function public.is_keeper(uuid) to authenticated;
grant execute on function public.has_consent(uuid) to authenticated;

-- One name for the thing every gated policy asks. Written once so a future
-- policy cannot get the rule subtly wrong.
create or replace function public.may_see_cards(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_keeper(hh)
      or (public.is_helper(hh) and public.has_consent(hh));
$$;

revoke execute on function public.may_see_cards(uuid) from public, anon;
grant execute on function public.may_see_cards(uuid) to authenticated;

-- ---------------------------------------------------------------- the cards
drop policy if exists "members read records" on public.records;
create policy "members read records" on public.records
  for select using (public.may_see_cards(household_id));

drop policy if exists "members add records" on public.records;
create policy "members add records" on public.records
  for insert with check (
    public.may_see_cards(household_id) and created_by = auth.uid()
  );

drop policy if exists "helpers change records" on public.records;
create policy "helpers change records" on public.records
  for update using (public.is_helper(household_id) and public.has_consent(household_id))
  with check (public.is_helper(household_id) and public.has_consent(household_id));

-- ------------------------------------------------------------- the reminders
drop policy if exists "members read reminders" on public.reminders;
create policy "members read reminders" on public.reminders
  for select using (public.may_see_cards(household_id));

drop policy if exists "helpers set reminders" on public.reminders;
create policy "helpers set reminders" on public.reminders
  for insert with check (
    public.is_helper(household_id) and public.has_consent(household_id)
  );

drop policy if exists "members update reminders" on public.reminders;
create policy "members update reminders" on public.reminders
  for update using (public.may_see_cards(household_id))
  with check (public.may_see_cards(household_id));

drop policy if exists "helpers remove reminders" on public.reminders;
create policy "helpers remove reminders" on public.reminders
  for delete using (
    public.is_helper(household_id) and public.has_consent(household_id)
  );

-- ---------------------------------------------------------------- the log
-- The keeper keeps reading this whichever way she has answered, because P18
-- says what the family did is hers to see, and because after a withdrawal the
-- log is the evidence of when it happened.
drop policy if exists "members read the activity log" on public.activity;
create policy "members read the activity log" on public.activity
  for select using (public.is_member(household_id));

drop policy if exists "members write the activity log" on public.activity;
create policy "members write the activity log" on public.activity
  for insert with check (
    public.is_keeper(household_id)
    or (public.is_helper(household_id) and public.has_consent(household_id))
    -- A withdrawal is itself written by whoever performed it, so the row that
    -- records the stopping must not be blocked by the stopping.
    or (public.is_member(household_id) and action in ('unlinked', 'linked'))
  );

-- --------------------------------------------------------------- the photos
-- Same rule for the pictures and the documents, which live in one bucket under
-- photos/<household>/. Reading a letter she has withdrawn consent for is the
-- same wrong as reading the card that points at it.
drop policy if exists "household photos readable" on storage.objects;
create policy "household photos readable" on storage.objects
  for select using (
    bucket_id = 'photos'
    and public.may_see_cards(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household photos writable" on storage.objects;
create policy "household photos writable" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.may_see_cards(((storage.foldername(name))[1])::uuid)
  );

-- ------------------------------------------------------------------ checks
do $$
declare
  v_n int;
begin
  select count(*) into v_n from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('is_keeper', 'has_consent', 'may_see_cards');
  raise notice 'gate functions present: % of 3', v_n;
end;
$$;

-- Every policy that now mentions consent, so it can be read rather than
-- assumed. If a table that holds her cards is missing from this list, it is
-- not gated.
select tablename, policyname, cmd
  from pg_policies
 where schemaname in ('public', 'storage')
   and (qual like '%may_see_cards%' or with_check like '%may_see_cards%'
     or qual like '%has_consent%' or with_check like '%has_consent%')
 order by tablename, policyname;

commit;
