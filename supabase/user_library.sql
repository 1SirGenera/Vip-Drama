-- VIP Drama: account-synced personal library
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.vip_user_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id bigint not null references public.vip_content(id) on delete cascade,
  favorite boolean not null default false,
  progress_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.vip_user_library enable row level security;

revoke all on table public.vip_user_library from anon;
grant select, insert, update, delete on table public.vip_user_library to authenticated;

drop policy if exists "Users can read own library" on public.vip_user_library;
create policy "Users can read own library"
on public.vip_user_library for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own library" on public.vip_user_library;
create policy "Users can insert own library"
on public.vip_user_library for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own library" on public.vip_user_library;
create policy "Users can update own library"
on public.vip_user_library for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own library" on public.vip_user_library;
create policy "Users can delete own library"
on public.vip_user_library for delete to authenticated
using (user_id = (select auth.uid()));

create index if not exists vip_user_library_updated_idx
on public.vip_user_library(user_id, updated_at desc);

create index if not exists vip_user_library_content_idx
on public.vip_user_library(content_id);
