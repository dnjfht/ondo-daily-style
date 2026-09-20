alter table public.profiles
  add column if not exists gender text check (gender in ('female', 'male', 'nonbinary', 'prefer_not')),
  add column if not exists age_range text check (age_range in ('10s', '20s', '30s', '40s', '50s', '60_plus', 'prefer_not'));

-- 가입 단계의 최소 인구통계 정보를 auth user metadata에서 개인 프로필로 옮깁니다.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, gender, age_range)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    nullif(new.raw_user_meta_data ->> 'age_range', '')
  )
  on conflict (id) do update set
    gender = coalesce(excluded.gender, public.profiles.gender),
    age_range = coalesce(excluded.age_range, public.profiles.age_range);
  return new;
end;
$$;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

comment on column public.profiles.gender is '사용자가 선택한 추천용 성별. 미응답은 유니섹스 상품으로 처리한다.';
comment on column public.profiles.age_range is '사용자가 선택한 추천용 연령대. 상품 검색어와 룩 난이도 조절에만 사용한다.';
