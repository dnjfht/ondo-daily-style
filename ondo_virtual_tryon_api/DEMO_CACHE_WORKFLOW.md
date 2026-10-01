# ONDO 시연용 가상 피팅 캐시 운영

## 채택 방식

Hugging Face ZeroGPU의 CatVTON 실행 결과를 **하루 10~20장 정도 사전 생성**하고, 결과 파일만 Supabase Storage와 `fitting_results`에 발행합니다. ONDO 웹은 생성 서버를 직접 호출하지 않고 캐시만 읽으므로, 무료 GPU 세션이 종료되어도 이미 발행된 피팅 결과는 그대로 보입니다.

사용자 원본 사진은 이 흐름에 사용하거나 저장하지 않습니다. 입력 인물은 `public/fitting/avatars/`의 ONDO 생성형 아바타만 사용합니다.

## 무료 GPU 전제

- Hugging Face ZeroGPU는 개인 무료 계정이 이메일 인증 및 30일 경과 조건을 충족하면 최대 2개의 ZeroGPU Space를 호스팅할 수 있습니다.
- 무료 계정의 일일 GPU 시간은 5분이며, 대기열과 잔여 쿼터에 따라 달라집니다. 따라서 10~20장은 짧은 추론 시간에만 가능한 **시연 목표**이며 보장 수량이 아닙니다.
- Space가 꺼지거나 대기열이 길면 그날의 새 결과 생성만 중단합니다. 웹의 캐시 조회와 기존 시연 결과에는 영향이 없습니다.

공식 조건: https://huggingface.co/docs/hub/main/spaces-zerogpu

## 모델 사용 범위

현재 포함된 CatVTON 코드와 가중치는 CC BY-NC-SA 4.0으로 안내되어 있습니다. 따라서 이 구성은 수업·포트폴리오·비상업 시연 범위에서만 사용하고, 상업 공개 전에는 별도 라이선스 검토 또는 상업 사용이 허용된 모델로 교체해야 합니다.

## 1회 운영 순서

1. ZeroGPU Space에서 카탈로그 상품과 아바타 조합을 생성합니다. 결과는 PNG/JPG/WEBP 파일로 저장합니다.
2. Supabase SQL Editor에서 `supabase/migrations/0007_fitting_results_cache.sql`을 한 번 적용합니다.
3. 프로젝트 루트의 `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`를 **로컬에서만** 추가합니다. 이 키는 Vercel이나 브라우저에 넣지 않습니다.
4. 생성 이미지 1장마다 아래처럼 발행합니다.

```powershell
node scripts/publish-fitting-cache.mjs `
  --file "C:\\path\\to\\result.png" `
  --body wave `
  --tone cool `
  --variant-id "카탈로그-variant-uuid" `
  --product-id "카탈로그-product-uuid"
```

5. 웹에서 해당 상품의 **이 상품 스캔하기**를 누릅니다. 캐시가 있으면 실제 생성 결과로 바뀌고, 없으면 “생성 캐시에 없습니다” 안내만 표시합니다.

## 배포 동작

`/api/fitting-results`는 공개 읽기 전용 캐시 조회 API입니다. 결과를 발행하는 스크립트는 관리자 키를 쓰므로 개발자 로컬 또는 신뢰된 CI에서만 실행합니다. 캐시 조회 API와 공개 Storage URL만 Vercel에 배포됩니다.
