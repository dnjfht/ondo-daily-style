alter table public.profiles
  add column if not exists style_preferences jsonb not null default '{}'::jsonb,
  add column if not exists analysis_completed_at timestamptz;

alter table public.outfits
  add column if not exists product_links jsonb not null default '[]'::jsonb,
  add column if not exists season_tags text[] not null default '{}',
  add column if not exists personal_color_tags text[] not null default '{}',
  add column if not exists body_type_tags text[] not null default '{}';

comment on column public.profiles.style_preferences is '취향 문답 결과. 원문 답변이 아닌 추천에 필요한 선택값만 저장한다.';
comment on column public.outfits.product_links is '제휴 또는 공식 상품 데이터의 merchant, label, url 배열. 현재 MVP에는 검색 링크만 둔다.';
