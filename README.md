# ONDO — 오늘의 온도, 나의 스타일

날씨, 상황, 개인 스타일 프로필을 조합해 데일리 코디와 상품 탐색 링크를 제안하는 Next.js MVP입니다.

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

환경변수를 넣지 않아도 샘플 코디 데이터로 화면을 확인할 수 있습니다. 프로필 저장과 이메일 매직 링크 로그인은 Supabase Auth 연결 뒤 활성화됩니다.

## 현재 사용자 흐름

1. 지역과 상황을 고르면 Open-Meteo 날씨에 맞는 오늘의 편집 룩을 봅니다.
2. 퍼스널컬러 셀프 체크, 골격 4문항, 취향 문답을 마치면 결과를 확인합니다.
3. 로그인한 사용자는 결과값만 `profiles`에 저장합니다. 사진 원본과 신체 치수는 저장하지 않습니다.
4. 룩에 연결된 상품 탐색 링크를 통해 무신사·29CM 등 카탈로그로 이동합니다. 현재 링크는 MVP 예시입니다.

## 상품 데이터 운영 제안

초기에는 직접 검수한 공식 브랜드·쇼핑몰 링크와 이미지 사용 허가를 받은 카탈로그를 `outfits.product_links`에 입력합니다. 이후 제휴가 가능해지면 제휴 네트워크 또는 각 판매처의 정식 상품 피드/API로 가격·재고·딥링크를 동기화합니다. 무단 크롤링으로 상품 이미지와 가격을 수집하지 않습니다.

## 데이터 원칙

얼굴 사진 원본은 기본 저장하지 않습니다. 분석 기능을 도입할 때에도 결과, 신뢰도, 사용자가 확정한 값만 DB에 보관하는 것을 기본값으로 합니다.

## 공개 저장소 보안 원칙

이 저장소에는 실제 Supabase URL, 키, 사용자 데이터, 얼굴 사진, 학습 데이터와 모델 파일을 올리지 않습니다. `.env.example`은 값이 비어 있는 설정 형식만 제공합니다. 실제 비밀 값은 개발자 컴퓨터의 `.env.local` 또는 배포 환경의 환경변수에만 설정합니다.
