-- Recall, patch 002. Run once in the Supabase SQL editor.
--
-- The consent screen is read out loud on her phone, and she answers it there.
-- The row that records it was therefore being written by a keeper device, and
-- the insert policy only allowed a helper to write one, so the yes could not be
-- recorded at all.
--
-- Who may write one is now any member of the household, which is either her own
-- phone or the family member sitting next to her. The row still says which
-- account wrote it and against which version of the notice, it is never
-- updatable except to mark a withdrawal, and it is never deletable.
--
-- Safe to run more than once.

drop policy if exists "helpers record consent" on public.consents;
drop policy if exists "members record consent" on public.consents;

create policy "members record consent" on public.consents
  for insert with check (public.is_member(household_id));

-- What is there now, so you can see it worked.
select polname, cmd, pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy
where polrelid = 'public.consents'::regclass
order by polname;
