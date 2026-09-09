-- Recall, patch 003. Run once in the Supabase SQL editor.
--
-- Three things a card could not hold before:
--
--   1. A document. A letter often arrives as a pdf or a docx by email rather
--      than on paper, and photographing a screen is a poor answer.
--   2. A checklist. What to bring to the hospital, what to buy, the steps for
--      the washing machine. It is a card with items that tick off.
--   3. A phone number, so a reminder can be a call and not just a message.
--      A reminder that says ring your daughter, with nothing to press, asks
--      somebody who forgets things to remember a number.
--
-- Safe to run more than once.

-- 1. Documents. The file itself lives in the photos bucket next to the
-- pictures, under the same household folder, so the storage policies that
-- already exist cover it without a new bucket.
alter table public.records add column if not exists file_path text;
alter table public.records add column if not exists file_name text default '';
alter table public.records add column if not exists file_type text default '';

-- What Recall managed to read out of that document, so it can be read aloud
-- without opening it again. Same column meaning as ocr_text has for a photo.
alter table public.records add column if not exists file_text text default '';

-- 2. Checklists. One row per card, the items in order, each with its own done
-- flag. jsonb rather than a table of its own: they are only ever read and
-- written as a whole list, and a separate table would need its own policies
-- for no gain.
alter table public.records add column if not exists items jsonb not null default '[]'::jsonb;

-- A checklist is a kind of card, so the check has to allow it.
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('person', 'letter', 'place', 'list'));

-- 3. Who to call. On the card rather than on the reminder, because it is a
-- fact about the person on the card and a card can have several reminders.
alter table public.records add column if not exists phone text default '';

-- And the reminder says what kind of thing it is asking for.
alter table public.reminders add column if not exists kind text not null default 'normal';
alter table public.reminders drop constraint if exists reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check
  check (kind in ('normal', 'call'));

-- Nothing about who may read or write any of this changes: these are columns
-- on tables that already carry the household policies, so a card's document,
-- its checklist and its phone number are reachable exactly by the people who
-- could already reach the card.

-- What is there now, so you can see it worked.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('records', 'reminders')
  and column_name in ('file_path', 'file_name', 'file_type', 'file_text',
                      'items', 'phone', 'kind')
order by table_name, column_name;
