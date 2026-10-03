-- VIP Drama: administrative roles and database-enforced permissions
-- Run once in Supabase SQL Editor after security_hardening.sql.
-- Existing administrators become owners on first run so the current project owner keeps access.

alter table public.vip_admins
  add column if not exists role text not null default 'owner'
  check (role in ('owner','admin','editor','moderator','analyst'));

-- Existing rows receive the temporary owner default above on first run.
-- New administrators created after this migration default to the regular admin role.
alter table public.vip_admins alter column role set default 'admin';

create or replace function public.has_admin_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vip_admins a
    where a.user_id = (select auth.uid())
      and a.role = any(required_roles)
  );
$$;

revoke execute on function public.has_admin_role(text[]) from public, anon;
grant execute on function public.has_admin_role(text[]) to authenticated;

-- The client only needs to read its own role. Owner-only role management is done through RPCs.
revoke all on table public.vip_admins from anon, authenticated;
grant select on public.vip_admins to authenticated;

drop policy if exists "Admins can read own admin row" on public.vip_admins;
create policy "Admins can read own admin row"
on public.vip_admins for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.admin_list_roles()
returns table(user_id uuid, email text, role text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select a.user_id, u.email, a.role, a.created_at
  from public.vip_admins a
  join auth.users u on u.id = a.user_id
  where public.has_admin_role(array['owner'])
  order by a.created_at asc;
$$;

create or replace function public.admin_set_role(p_email text, p_role text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'owner_only';
  end if;
  if p_role not in ('owner','admin','editor','moderator','analyst') then
    raise exception 'invalid_role';
  end if;

  select id into target_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if target_id is null then
    raise exception 'user_not_found';
  end if;

  insert into public.vip_admins(user_id, role)
  values (target_id, p_role)
  on conflict (user_id) do update
    set role=excluded.role;

  return true;
end;
$$;

create or replace function public.admin_remove_role(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  owner_count integer;
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'owner_only';
  end if;

  select role into target_role from public.vip_admins where user_id=p_user_id;
  if target_role is null then return true; end if;

  if target_role='owner' then
    select count(*) into owner_count from public.vip_admins where role='owner';
    if owner_count <= 1 then
      raise exception 'cannot_remove_last_owner';
    end if;
  end if;

  delete from public.vip_admins where user_id=p_user_id;
  return true;
end;
$$;

revoke execute on function public.admin_list_roles() from public, anon;
revoke execute on function public.admin_set_role(text,text) from public, anon;
revoke execute on function public.admin_remove_role(uuid) from public, anon;
grant execute on function public.admin_list_roles() to authenticated;
grant execute on function public.admin_set_role(text,text) to authenticated;
grant execute on function public.admin_remove_role(uuid) to authenticated;

-- Content catalog permissions.
drop policy if exists "Admins can read all VIP content" on public.vip_content;
create policy "Admins can read all VIP content"
on public.vip_content for select to authenticated
using ((select public.has_admin_role(array['owner','admin','editor','moderator','analyst'])));

drop policy if exists "Admins can insert VIP content" on public.vip_content;
create policy "Admins can insert VIP content"
on public.vip_content for insert to authenticated
with check ((select public.has_admin_role(array['owner','admin','editor'])));

drop policy if exists "Admins can update VIP content" on public.vip_content;
create policy "Admins can update VIP content"
on public.vip_content for update to authenticated
using ((select public.has_admin_role(array['owner','admin','editor'])))
with check ((select public.has_admin_role(array['owner','admin','editor'])));

drop policy if exists "Admins can delete VIP content" on public.vip_content;
create policy "Admins can delete VIP content"
on public.vip_content for delete to authenticated
using ((select public.has_admin_role(array['owner','admin','editor'])));

-- Series management.
drop policy if exists "Admins can manage seasons" on public.vip_seasons;
create policy "Admins can manage seasons"
on public.vip_seasons for all to authenticated
using ((select public.has_admin_role(array['owner','admin','editor'])))
with check ((select public.has_admin_role(array['owner','admin','editor'])));

drop policy if exists "Admins can manage episodes" on public.vip_episodes;
create policy "Admins can manage episodes"
on public.vip_episodes for all to authenticated
using ((select public.has_admin_role(array['owner','admin','editor'])))
with check ((select public.has_admin_role(array['owner','admin','editor'])));

-- Rights queue: owner/admin/moderator can review it.
drop policy if exists "rights_requests_admin_all" on public.vip_rights_requests;
create policy "rights_requests_admin_all"
on public.vip_rights_requests for all to authenticated
using ((select public.has_admin_role(array['owner','admin','moderator'])))
with check ((select public.has_admin_role(array['owner','admin','moderator'])));

-- Existing episode view function remains public, but only published episodes are counted.
