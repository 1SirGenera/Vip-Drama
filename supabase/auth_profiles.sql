-- VIP Drama: production-ready user profile layer
-- Run once in Supabase SQL Editor after the existing schema.
-- Safe to re-run.

create table if not exists public.vip_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vip_profiles enable row level security;

revoke all on table public.vip_profiles from anon;
grant select, insert, update on table public.vip_profiles to authenticated;

drop policy if exists "Users can read own profile" on public.vip_profiles;
create policy "Users can read own profile"
on public.vip_profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Users can insert own profile" on public.vip_profiles;
create policy "Users can insert own profile"
on public.vip_profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.vip_profiles;
create policy "Users can update own profile"
on public.vip_profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create or replace function public.vip_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vip_profiles_updated_at on public.vip_profiles;
create trigger vip_profiles_updated_at
before update on public.vip_profiles
for each row execute function public.vip_set_updated_at();

create or replace function public.vip_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vip_profiles (id, display_name, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.vip_profiles.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

revoke execute on function public.vip_handle_new_user() from public;
grant execute on function public.vip_handle_new_user() to service_role;

drop trigger if exists on_auth_user_created_vip_profile on auth.users;
create trigger on_auth_user_created_vip_profile
after insert on auth.users
for each row execute function public.vip_handle_new_user();

-- Backfill existing users without exposing auth.users to the browser.
insert into public.vip_profiles (id, email, display_name)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), '')
from auth.users u
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.vip_profiles.display_name, excluded.display_name),
    updated_at = now();

create index if not exists vip_profiles_updated_idx
on public.vip_profiles(updated_at desc);
