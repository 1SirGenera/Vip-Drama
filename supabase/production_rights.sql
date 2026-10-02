-- VIP Drama production rights migration
-- Run once in Supabase SQL Editor.
alter table public.vip_content add column if not exists license_url text;
alter table public.vip_content add column if not exists rights_holder text;
alter table public.vip_content add column if not exists rights_status text not null default 'verified';
alter table public.vip_content add column if not exists published boolean not null default true;
alter table public.vip_content add column if not exists territories text default 'Worldwide';
alter table public.vip_content add column if not exists age_rating text;
alter table public.vip_content add column if not exists language text;
alter table public.vip_content add column if not exists subtitle_languages text;
alter table public.vip_content add column if not exists seo_slug text;
create unique index if not exists vip_content_seo_slug_idx on public.vip_content(seo_slug) where seo_slug is not null;
create index if not exists vip_content_published_idx on public.vip_content(published);
create index if not exists vip_content_type_idx on public.vip_content(type);
create index if not exists vip_content_year_idx on public.vip_content(year);
