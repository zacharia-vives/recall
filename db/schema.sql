-- Recall database, for the Supabase project (step 5 of the build order).
-- Run this in the Supabase SQL editor. Nothing here is used while the app runs
-- local only, which is the default.
--
-- Requirement P6: row level security on every table, checked by the database
-- and not by the client. Requirement P5: photos live in a private bucket.

create extension if not exists "pgcrypto";

-- records ------------------------------------------------------------------

create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('person', 'letter', 'place')),
  title       text not null check (char_length(title) between 1 and 200),
  people      text[] not null default '{}',
  place       text default '',
  happens_at  timestamptz,
  tags        text[] not null default '{}',
  photo_path  text,
  ocr_text    text default '',
  created_at  timestamptz not null default now()
);

create index if not exists records_owner_created_idx
  on public.records (owner_id, created_at desc);

alter table public.records enable row level security;

create policy "records are readable by their owner"
  on public.records for select
  using (auth.uid() = owner_id);

create policy "records are inserted by their owner"
  on public.records for insert
  with check (auth.uid() = owner_id);

create policy "records are updated by their owner"
  on public.records for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "records are deleted by their owner"
  on public.records for delete
  using (auth.uid() = owner_id);

-- reminders ----------------------------------------------------------------

create table if not exists public.reminders (
  id           uuid primary key default gen_random_uuid(),
  record_id    uuid not null references public.records (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  due_at       timestamptz not null,
  repeat       text not null default 'none'
               check (repeat in ('none', 'daily', 'twice_daily', 'weekly')),
  spoken_text  text default '',
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists reminders_owner_due_idx
  on public.reminders (owner_id, due_at);

alter table public.reminders enable row level security;

create policy "reminders are readable by their owner"
  on public.reminders for select
  using (auth.uid() = owner_id);

create policy "reminders are inserted by their owner"
  on public.reminders for insert
  with check (auth.uid() = owner_id);

create policy "reminders are updated by their owner"
  on public.reminders for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "reminders are deleted by their owner"
  on public.reminders for delete
  using (auth.uid() = owner_id);

-- consent log --------------------------------------------------------------
-- Requirement P4: explicit consent for article 9 data has to be provable, so we
-- write down when it was given and which version of the notice was read.

create table if not exists public.consents (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  notice_version text not null,
  given_at      timestamptz not null default now(),
  withdrawn_at  timestamptz,
  helper_email  text
);

alter table public.consents enable row level security;

create policy "consents are readable by their owner"
  on public.consents for select
  using (auth.uid() = owner_id);

create policy "consents are inserted by their owner"
  on public.consents for insert
  with check (auth.uid() = owner_id);

create policy "consents are updated by their owner"
  on public.consents for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- photo storage ------------------------------------------------------------
-- Create a bucket called "photos" in the dashboard and leave "public" off.
-- Paths are "<owner id>/<record id>.jpg", which is what these policies check.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "own photos readable"
  on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own photos writable"
  on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own photos removable"
  on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
