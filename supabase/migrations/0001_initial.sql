create type public.situation as enum ('daily', 'work', 'date');
create type public.personal_color as enum ('warm', 'cool', 'neutral');
create type public.body_type as enum ('straight', 'wave', 'natural');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  personal_color public.personal_color,
  body_type public.body_type,
  preferred_style text,
  preferred_city text not null default 'seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null,
  style_tag text not null,
  situation public.situation not null,
  min_temp numeric not null,
  max_temp numeric not null,
  image_url text not null,
  colors text[] not null default '{}',
  reason text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  name text not null,
  position smallint not null,
  unique (outfit_id, position)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  score numeric not null,
  reason text not null,
  weather_snapshot jsonb,
  shown_at timestamptz not null default now()
);

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  is_saved boolean not null default false,
  reaction text check (reaction in ('like', 'dislike')),
  worn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, outfit_id)
);

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('personal_color', 'body_ratio', 'outfit_classification')),
  result jsonb not null,
  confidence numeric,
  user_confirmed_value text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.recommendations enable row level security;
alter table public.user_feedback enable row level security;
alter table public.analysis_results enable row level security;

create policy "Users manage their own profile" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Published outfits are public" on public.outfits for select using (is_published = true);
create policy "Items of published outfits are public" on public.outfit_items for select using (exists (select 1 from public.outfits where outfits.id = outfit_items.outfit_id and outfits.is_published = true));
create policy "Users read own recommendations" on public.recommendations for select using ((select auth.uid()) = user_id);
create policy "Users manage own feedback" on public.user_feedback for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read own analyses" on public.analysis_results for select using ((select auth.uid()) = user_id);
