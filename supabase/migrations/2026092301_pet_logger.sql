-- PawSattva pet food logger
-- Requires the Phase 1 profiles/firebase_uid() migration.

create table if not exists public.pet_logger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  logged_on date not null,
  pet_name text not null,
  meal_type text not null default 'other'
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'supplement', 'other')),
  logged_at time,
  food_name text not null,
  quantity text,
  water_ml integer check (water_ml is null or water_ml >= 0),
  treats text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_logger_entries_user_date_idx
  on public.pet_logger_entries(user_id, logged_on desc, logged_at desc);

alter table public.pet_logger_entries enable row level security;

drop policy if exists "pet logger own read" on public.pet_logger_entries;
create policy "pet logger own read"
on public.pet_logger_entries
for select
to public
using (user_id = public.firebase_uid());

drop policy if exists "pet logger own insert" on public.pet_logger_entries;
create policy "pet logger own insert"
on public.pet_logger_entries
for insert
to public
with check (user_id = public.firebase_uid());

drop policy if exists "pet logger own update" on public.pet_logger_entries;
create policy "pet logger own update"
on public.pet_logger_entries
for update
to public
using (user_id = public.firebase_uid())
with check (user_id = public.firebase_uid());

drop policy if exists "pet logger own delete" on public.pet_logger_entries;
create policy "pet logger own delete"
on public.pet_logger_entries
for delete
to public
using (user_id = public.firebase_uid());

grant select, insert, update, delete on public.pet_logger_entries to anon, authenticated;
