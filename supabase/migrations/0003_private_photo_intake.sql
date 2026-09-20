-- 사진은 공개 URL을 만들지 않는 private Storage 버킷에만 보관합니다.
-- AI 서비스가 연결되면 *_ai_result를 기록하고 해당 값이 설문 결과보다 우선 적용됩니다.
alter table public.profiles
  add column if not exists personal_color_photo_path text,
  add column if not exists body_photo_path text,
  add column if not exists personal_color_source text not null default 'survey'
    check (personal_color_source in ('survey', 'photo_pending', 'ai')),
  add column if not exists body_type_source text not null default 'survey'
    check (body_type_source in ('survey', 'photo_pending', 'ai')),
  add column if not exists personal_color_ai_result public.personal_color,
  add column if not exists body_type_ai_result public.body_type;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('style-photos', 'style-photos', false, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 12582912,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Users upload their own style photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'style-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users view their own style photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'style-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users delete their own style photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'style-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

comment on column public.profiles.personal_color_source is 'survey: 설문 결과, photo_pending: 사진 AI 분석 대기, ai: AI 결과 적용';
comment on column public.profiles.body_type_source is 'survey: 설문 결과, photo_pending: 사진 AI 분석 대기, ai: AI 결과 적용';
