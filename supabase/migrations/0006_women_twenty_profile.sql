-- ONDO는 20대 여성을 위한 추천으로 전환합니다.
-- 기존의 중립 퍼스널컬러는 웜으로 정규화하고, 이후에는 웜/쿨만 저장합니다.
begin;

update public.profiles
set personal_color = 'warm'
where personal_color::text = 'neutral';

update public.profiles
set personal_color_ai_result = 'warm'
where personal_color_ai_result::text = 'neutral';

alter table public.profiles
  alter column personal_color type text using personal_color::text,
  alter column personal_color_ai_result type text using personal_color_ai_result::text;

drop type public.personal_color;
create type public.personal_color as enum ('warm', 'cool');

alter table public.profiles
  alter column personal_color type public.personal_color using personal_color::public.personal_color,
  alter column personal_color_ai_result type public.personal_color using personal_color_ai_result::public.personal_color,
  drop column if exists gender,
  drop column if exists age_range,
  add column if not exists body_survey_answers jsonb not null default '{}'::jsonb;

-- 새 가입자는 인구통계 정보 없이 개인 프로필 행만 생성합니다.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 테스트 계정을 포함한 기존 계정의 더 이상 사용하지 않는 메타데이터도 정리합니다.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'gender' - 'age_range'
where raw_user_meta_data ?| array['gender', 'age_range'];

comment on column public.profiles.body_survey_answers is '골격 스타일 13문항 중 11개 자가 문항의 응답. 사진 AI 연결 전 설문 기반 결과를 재현하는 데 사용한다.';

commit;
