-- PawSattva Phase 1 Firebase -> Supabase bridge
-- Firebase Authentication remains the identity provider.
-- User identity is read from the verified Firebase JWT (sub claim).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  email text,
  display_name text,
  photo_url text,
  phone text,
  whatsapp_phone text,
  whatsapp_same_as_phone boolean default true,
  receive_updates boolean default false,
  admin boolean not null default false,
  role text not null default 'user'
    check (role in ('user', 'author', 'admin')),
  pet_feeds jsonb not null default '[]'::jsonb,
  pet_feed_draft jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_feeds (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.profiles(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pet_feeds_user_id_idx on public.pet_feeds(user_id);
create index if not exists pet_feeds_created_at_idx on public.pet_feeds(created_at desc);

alter table public.profiles enable row level security;
alter table public.pet_feeds enable row level security;

-- Firebase UIDs are strings, so use the JWT sub claim directly instead of
-- requiring the user id to be a Postgres UUID.
create or replace function public.firebase_uid()
returns text
language sql
stable
as $$
  select nullif(auth.jwt()->>'sub', '');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = public.firebase_uid()
      and role in ('author', 'admin')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;

-- Profiles: a signed Firebase user can create/read/update their own profile.
-- Hosted Supabase validates that Firebase JWTs come from the configured
-- Firebase project before the request reaches Postgres.
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read"
on public.profiles
for select
to public
using (id = public.firebase_uid());

drop policy if exists "profiles staff read" on public.profiles;
create policy "profiles staff read"
on public.profiles
for select
to public
using (public.is_staff());

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert"
on public.profiles
for insert
to public
with check (
  id = public.firebase_uid()
  and coalesce(admin, false) = false
  and role = 'user'
);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
on public.profiles
for update
to public
using (id = public.firebase_uid())
with check (id = public.firebase_uid());

drop policy if exists "profiles staff update" on public.profiles;
create policy "profiles staff update"
on public.profiles
for update
to public
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "profiles staff delete" on public.profiles;
create policy "profiles staff delete"
on public.profiles
for delete
to public
using (public.is_staff());

grant select, insert, delete on public.profiles to anon, authenticated;
grant update (
  email,
  display_name,
  photo_url,
  phone,
  whatsapp_phone,
  whatsapp_same_as_phone,
  receive_updates,
  pet_feeds,
  pet_feed_draft,
  updated_at
) on public.profiles to anon, authenticated;

-- Role changes must go through this staff-only function so users cannot
-- promote themselves through the Data API.
create or replace function public.set_profile_role(
  target_id text,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required';
  end if;

  if new_role not in ('user', 'author', 'admin') then
    raise exception 'invalid role';
  end if;

  update public.profiles
  set
    role = new_role,
    admin = new_role in ('author', 'admin'),
    updated_at = now()
  where id = target_id;
end;
$$;

revoke all on function public.set_profile_role(text, text) from public;
grant execute on function public.set_profile_role(text, text) to anon, authenticated;

-- PetFeed: users own their assessments; staff can review all assessments.
drop policy if exists "pet feeds own read" on public.pet_feeds;
create policy "pet feeds own read"
on public.pet_feeds
for select
to public
using (user_id = public.firebase_uid());

drop policy if exists "pet feeds staff read" on public.pet_feeds;
create policy "pet feeds staff read"
on public.pet_feeds
for select
to public
using (public.is_staff());

drop policy if exists "pet feeds own insert" on public.pet_feeds;
create policy "pet feeds own insert"
on public.pet_feeds
for insert
to public
with check (user_id = public.firebase_uid());

grant select, insert on public.pet_feeds to anon, authenticated;

-- Public media bucket for compressed blog and breed assets.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
on storage.objects
for select
to public
using (bucket_id = 'media');

drop policy if exists "media staff insert" on storage.objects;
create policy "media staff insert"
on storage.objects
for insert
to public
with check (
  bucket_id = 'media'
  and public.is_staff()
);

drop policy if exists "media staff update" on storage.objects;
create policy "media staff update"
on storage.objects
for update
to public
using (
  bucket_id = 'media'
  and public.is_staff()
)
with check (
  bucket_id = 'media'
  and public.is_staff()
);

drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'media'
  and public.is_staff()
);
