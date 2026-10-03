-- VIP Drama security hardening for an existing Supabase project
-- Run once in Supabase SQL Editor.
-- Public users can read published titles only; admins can read all titles.
drop policy if exists "Public can read VIP content" on public.vip_content;
create policy "Public can read VIP content"
on public.vip_content
for select
to anon, authenticated
using (published = true);

drop policy if exists "Admins can read all VIP content" on public.vip_content;
create policy "Admins can read all VIP content"
on public.vip_content
for select
to authenticated
using (
  exists (
    select 1 from public.vip_admins a
    where a.user_id = (select auth.uid())
  )
);

create or replace function public.record_view(p_content_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count bigint;
begin
  update public.vip_content
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_content_id
    and published = true
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

revoke execute on function public.record_view(bigint) from public;
grant execute on function public.record_view(bigint) to anon, authenticated;
