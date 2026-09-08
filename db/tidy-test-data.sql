-- Tidy up after the test pass of 8 September 2026.
--
-- Two households were made by test sessions that signed in anonymously. An
-- anonymous account cannot be signed into again, so nobody can delete these
-- from inside the family app, and they would sit in the picker for ever.
--
-- The second statement is general housekeeping rather than a one off: a photo
-- lives in storage under the household it belongs to, and deleting a household
-- cascades its rows but not its files.
--
-- Safe to run more than once. It never touches a household with a real name.

delete from public.households
where name in ('Test pass, delete me', 'Axe check, delete me', 'Sync test, delete me');

delete from storage.objects
where bucket_id = 'photos'
  and split_part(name, '/', 1) not in (select id::text from public.households);

-- What is left, so you can see it worked.
select h.name,
       h.created_at::date as made,
       (select count(*) from public.memberships m where m.household_id = h.id) as people,
       (select count(*) from public.records r where r.household_id = h.id) as cards
from public.households h
order by h.created_at;
