-- Tidy up after the test pass of 8 September 2026. Already run.
--
-- Households made by test sessions that signed in anonymously. An anonymous
-- account cannot be signed into again, so nobody can delete these from inside
-- the family app, and they would sit in the picker for ever.
--
-- Safe to run more than once. It never touches a household with a real name.

delete from public.households
where name in ('Test pass, delete me', 'Axe check, delete me', 'Sync test, delete me');

-- The two empty households from the morning, when one press made three of them.
-- Anything with a card in it, or with more than one person in it, is left alone.

delete from public.households h
where (select count(*) from public.records r where r.household_id = h.id) = 0
  and (select count(*) from public.memberships m where m.household_id = h.id) <= 1;

-- What is left, so you can see it worked.

select h.name,
       h.created_at::date as made,
       (select count(*) from public.memberships m where m.household_id = h.id) as people,
       (select count(*) from public.records r where r.household_id = h.id) as cards
from public.households h
order by h.created_at;

-- ------------------------------------------------------------- the photo files
--
-- Deleting a household cascades its rows but not its photos, and the files
-- cannot be removed from here: storage refuses a direct delete on purpose.
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--                Use the Storage API instead.
--
-- So the leftovers go through Storage in the dashboard: open the photos bucket
-- and delete the folders whose name is not in the list below. Nothing can read
-- them in the meantime, because a photo is only ever reachable through a signed
-- link, and a link is only signed for somebody who is in that household.

select id::text as keep_this_folder, name
from public.households
order by created_at;
