create table if not exists public.saved_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  look_key text not null,
  look jsonb not null,
  saved_at timestamptz not null default now(),
  unique (user_id, look_key)
);

alter table public.saved_looks enable row level security;

create policy "Users manage their own saved looks"
on public.saved_looks for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists saved_looks_user_saved_at_idx
on public.saved_looks (user_id, saved_at desc);
