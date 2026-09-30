create table public.recommendation_rationales (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  evidence_type text not null check (evidence_type in ('official', 'research', 'editorial')),
  source_url text,
  explanation text not null,
  reviewed_at timestamptz not null default now()
);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  source_product_id text not null unique,
  name text not null,
  category text not null check (category in ('outer', 'top', 'bottom', 'shoes', 'bag')),
  subtype text not null,
  fit text not null default 'unknown' check (fit in ('slim', 'regular', 'relaxed', 'oversized', 'unknown')),
  length text not null default 'unknown' check (length in ('cropped', 'short', 'regular', 'midi', 'long', 'unknown')),
  neckline text not null default 'unknown' check (neckline in ('crew', 'v', 'square', 'collar', 'none', 'unknown')),
  waist_definition text not null default 'unknown' check (waist_definition in ('none', 'subtle', 'defined', 'unknown')),
  material text not null default 'unknown',
  formality text not null default 'casual' check (formality in ('casual', 'smart', 'formal')),
  warmth_level smallint not null default 1 check (warmth_level between 0 and 4),
  breathability_level smallint not null default 2 check (breathability_level between 0 and 4),
  wind_block_level smallint not null default 0 check (wind_block_level between 0 and 4),
  water_resistance text not null default 'none' check (water_resistance in ('none', 'light', 'rain')),
  active boolean not null default true,
  annotation_version text not null default 'v1-rule-assisted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  color_name text not null,
  image_path text not null,
  personal_color_match text not null check (personal_color_match in ('warm', 'cool', 'both')),
  color_hex text,
  created_at timestamptz not null default now(),
  unique (product_id, color_name)
);

create table public.catalog_tags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  dimension text not null check (dimension in ('body_type', 'mood', 'silhouette', 'situation')),
  value text not null,
  score smallint not null check (score between -3 and 3),
  rationale_id uuid references public.recommendation_rationales(id),
  unique (product_id, dimension, value)
);

create table public.catalog_weather_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.catalog_products(id) on delete cascade,
  apparent_temp_min numeric not null,
  apparent_temp_max numeric not null,
  humidity_max smallint not null check (humidity_max between 0 and 100),
  wind_max_mps numeric not null,
  precipitation text not null check (precipitation in ('none', 'light_ok', 'rain_ok')),
  diurnal_range text not null check (diurnal_range in ('stable', 'layerable')),
  score smallint not null default 3 check (score between -3 and 3),
  rationale_id uuid references public.recommendation_rationales(id),
  check (apparent_temp_min <= apparent_temp_max)
);

create table public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.catalog_variants(id) on delete cascade,
  shown_at timestamptz not null default now(),
  saved_at timestamptz
);

create index catalog_products_category_idx on public.catalog_products(category) where active;
create index catalog_variants_product_idx on public.catalog_variants(product_id, personal_color_match);
create index catalog_tags_lookup_idx on public.catalog_tags(dimension, value, product_id);
create index recommendation_events_recent_idx on public.recommendation_events(user_id, shown_at desc);

alter table public.recommendation_rationales enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_variants enable row level security;
alter table public.catalog_tags enable row level security;
alter table public.catalog_weather_rules enable row level security;
alter table public.recommendation_events enable row level security;

create policy "Catalog is public to read" on public.catalog_products for select using (active);
create policy "Catalog variants are public to read" on public.catalog_variants for select using (true);
create policy "Catalog tags are public to read" on public.catalog_tags for select using (true);
create policy "Catalog weather rules are public to read" on public.catalog_weather_rules for select using (true);
create policy "Catalog rationale is public to read" on public.recommendation_rationales for select using (true);
create policy "Users read their own recommendation events" on public.recommendation_events for select using ((select auth.uid()) = user_id);
create policy "Users create their own recommendation events" on public.recommendation_events for insert with check ((select auth.uid()) = user_id);

comment on table public.catalog_products is 'ONDO 내부 추천용 상품 구조·착용 맥락 메타데이터';
comment on column public.catalog_variants.personal_color_match is '사용자 진단 웜/쿨과 직접 매칭하는 색상 옵션. both는 양쪽에 무난한 색상이다.';
