-- VIP Drama: public content request form migration
-- Run once in Supabase SQL Editor.
-- Visitors may submit pending requests only. They cannot read or modify requests.

alter table public.vip_rights_requests
  add column if not exists requester_name text,
  add column if not exists requester_email text;

revoke all on table public.vip_rights_requests from anon, authenticated;
grant insert on table public.vip_rights_requests to anon, authenticated;
grant select, update, delete on table public.vip_rights_requests to authenticated;

drop policy if exists "rights_requests_public_submit" on public.vip_rights_requests;
create policy "rights_requests_public_submit"
on public.vip_rights_requests
for insert
to anon, authenticated
with check (
  rights_status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "rights_requests_admin_all" on public.vip_rights_requests;
create policy "rights_requests_admin_all"
on public.vip_rights_requests
for all
to authenticated
using (
  exists (
    select 1 from public.vip_admins a
    where a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.vip_admins a
    where a.user_id = (select auth.uid())
  )
);

create index if not exists vip_rights_requests_requester_email_idx
  on public.vip_rights_requests(requester_email);
