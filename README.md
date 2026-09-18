# ONDO — 오늘의 온도, 나의 스타일

날씨, 상황, 개인 스타일 프로필을 조합해 데일리 코디 Top 3를 제안하는 Next.js MVP입니다.

## 기술 구성

- Next.js App Router: 화면, Server Actions, Route Handlers
- Supabase: PostgreSQL, Auth, Storage
- Open-Meteo: 날씨 조회
- FastAPI: 향후 Python 기반 퍼스널컬러·MediaPipe·CNN 분석 전용 서비스

## 로컬 실행

1. `.env.example`을 복사해 `.env.local`을 만듭니다.
2. Supabase Dashboard에서 URL과 Publishable Key를 `.env.local`에 입력합니다.
3. Supabase SQL Editor에서 `supabase/migrations/0001_initial.sql`을 실행합니다.
4. `pnpm install` 후 `pnpm dev`를 실행합니다.

환경변수를 넣지 않아도 샘플 코디 데이터로 화면을 확인할 수 있습니다. 프로필 저장은 Supabase Auth 로그인 뒤 활성화됩니다.

## 데이터 원칙

얼굴 사진 원본은 기본 저장하지 않습니다. 분석 기능을 도입할 때에도 결과, 신뢰도, 사용자가 확정한 값만 DB에 보관하는 것을 기본값으로 합니다.

## 공개 저장소 보안 원칙

이 저장소에는 실제 Supabase URL, 키, 사용자 데이터, 얼굴 사진, 학습 데이터와 모델 파일을 올리지 않습니다. `.env.example`은 값이 비어 있는 설정 형식만 제공합니다. 실제 비밀 값은 개발자 컴퓨터의 `.env.local` 또는 배포 환경의 환경변수에만 설정합니다.
