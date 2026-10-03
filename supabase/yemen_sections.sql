-- VIP Drama — Yemen content organization
-- Step 1: add legal/content classification fields for Yemeni series and plays.
-- Run this in Supabase SQL Editor, then continue to Step 2.

alter table public.vip_content
  add column if not exists origin_country text default null;

alter table public.vip_content
  add column if not exists collection text default null;

create index if not exists vip_content_origin_country_idx
  on public.vip_content(origin_country);

create index if not exists vip_content_collection_idx
  on public.vip_content(collection);

comment on column public.vip_content.origin_country is
  'Country/region of production. Example: Yemen.';

comment on column public.vip_content.collection is
  'Platform collection/category. Example: Yemeni Series or Yemeni Theater.';

-- Legal publishing rule:
-- Do not publish a title unless its license/rights evidence has been verified.
-- Use published=false while rights are being checked.
