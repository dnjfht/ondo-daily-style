-- 시연용 가상 피팅 결과는 사용자 사진이 아닌 미리 생성한 ONDO 아바타만 사용합니다.
-- 무료 GPU 세션이 종료돼도 여기의 URL과 Storage 파일은 유지됩니다.
create table if not exists public.fitting_results (
  id uuid primary key default gen_random_uuid(),
  body_type public.body_type not null,
  tone public.personal_color not null,
  variant_id uuid not null references public.catalog_variants(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  model_version text not null default 'demo-v1',
  status text not null default 'ready' check (status in ('ready', 'failed')),
  image_url text not null,
  generator text not null default 'demo-gpu-cache',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (body_type, tone, variant_id, model_version)
);

alter table public.fitting_results enable row level security;

create policy "Anyone can read published fitting cache"
on public.fitting_results for select
using (status = 'ready');

create index if not exists fitting_results_lookup_idx
on public.fitting_results (body_type, tone, variant_id, model_version)
where status = 'ready';

-- 결과물은 실사용자 사진이 아닌 공개 ONDO 아바타 이미지이므로 읽기 전용 공개 버킷을 사용합니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fitting-results', 'fitting-results', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

create policy "Anyone can view fitting cache files"
on storage.objects for select
using (bucket_id = 'fitting-results');

comment on table public.fitting_results is '무료 GPU로 미리 생성한 ONDO 아바타 가상 피팅 결과 캐시. 사용자 원본 사진은 저장하지 않는다.';
