-- VIP Drama catalog repair / safe re-run
-- Run this once in Supabase SQL Editor after the website update.
-- Only verified/openly licensed sources are referenced here.

alter table public.vip_content
  add column if not exists view_count bigint not null default 0;

update public.vip_content
set video_url='https://video.blender.org/static/webseed/bf1f3fb5-b119-4f9f-9930-8e20e892b898-720.mp4',
    embed_url='https://video.blender.org/videos/embed/bf1f3fb5-b119-4f9f-9930-8e20e892b898',
    updated_at=now()
where title='Big Buck Bunny';

update public.vip_content
set video_url='https://video.blender.org/static/webseed/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40-720.mp4',
    embed_url='https://video.blender.org/videos/embed/0eb052d0-fd51-43e6-aa33-ecdbf77a5d40',
    updated_at=now()
where title='Sintel';

update public.vip_content
set video_url='https://video.blender.org/static/webseed/cccc3e60-0291-4ecc-aa56-39b2e2c7d0d5-720.mp4',
    embed_url='https://video.blender.org/videos/embed/cccc3e60-0291-4ecc-aa56-39b2e2c7d0d5',
    updated_at=now()
where title='Elephants Dream';

update public.vip_content
set video_url='https://video.blender.org/static/webseed/8533ea43-4271-4a57-9694-e9d0b35e1aa1-720.mp4',
    embed_url='https://video.blender.org/videos/embed/8533ea43-4271-4a57-9694-e9d0b35e1aa1',
    updated_at=now()
where title='Tears of Steel';

update public.vip_content
set video_url='https://video.blender.org/static/webseed/3d95fb3d-c866-42c8-9db1-fe82f48ccb95-720.mp4',
    embed_url='https://video.blender.org/videos/embed/3d95fb3d-c866-42c8-9db1-fe82f48ccb95',
    license='Creative Commons Attribution 4.0',
    source='Blender Studio',
    updated_at=now()
where title='Spring';

update public.vip_content
set video_url=null,
    embed_url='https://video.blender.org/videos/embed/09f77c81-7b1b-483a-9d46-b14f2078c604',
    updated_at=now()
where title='Charge';

update public.vip_content
set video_url='https://video.blender.org/download/videos/a69d68a5-a0e0-4a80-9d66-49f093c97aaf-720.mp4',
    embed_url='https://video.blender.org/videos/embed/a69d68a5-a0e0-4a80-9d66-49f093c97aaf',
    license='Creative Commons Attribution 1.0',
    source='Blender Studio',
    updated_at=now()
where title='Sprite Fright';

update public.vip_content
set video_url=null,
    embed_url='https://video.blender.org/videos/embed/bd0084a5-1d26-4816-ab5e-1bad9e2fb990',
    license='Creative Commons Attribution 4.0',
    source='Blender Studio',
    updated_at=now()
where title='Wing It!';

update public.vip_content
set video_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/CaptainVideo1949.ogv',
    embed_url=null,
    license='Public Domain (وفق صفحة الملف؛ تحقق من بلدك)',
    source='Wikimedia Commons',
    updated_at=now()
where title='Captain Video – Episode';

update public.vip_content
set video_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/001-Felix-the-Cat-S01E01-The-Magic-Bag.webm',
    embed_url=null,
    updated_at=now()
where title='Felix the Cat – The Magic Bag';

delete from public.vip_content
where title='Cosmos Laundromat: First Cycle';

create or replace function public.record_view(p_content_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare new_count bigint;
begin
  update public.vip_content
  set view_count=view_count+1, updated_at=now()
  where id=p_content_id
  returning view_count into new_count;
  return coalesce(new_count,0);
end;
$$;

revoke execute on function public.record_view(bigint) from public;
grant execute on function public.record_view(bigint) to anon, authenticated;