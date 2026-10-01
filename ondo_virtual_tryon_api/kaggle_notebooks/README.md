# Kaggle 가상 피팅 생성 노트북

무료 Kaggle GPU(T4 x2)에서 착용 이미지를 미리 만들어 Supabase `fitting_results`에 캐시하는 노트북입니다.
입력 데이터셋: Kaggle `ondo-tryon-kit` (기본 모델 6장 `{body}_{tone}_lower_base.png`, `catalog-v3` 상품 이미지, `jobs.csv`).

| 노트북 | 대상 | 모델 |
|---|---|---|
| `ondo_catvton_clothes.ipynb` | 상의·하의·아우터 (990장) | CatVTON (옷 전용) |
| `ondo_omnitry_shoes_bags.ipynb` | 신발·가방 (600장) | OmniTry LoRA + FLUX.1 Fill(nf4), 발/상체만 잘라 생성 후 합성 |

- 한 장에 한 품목만 입힙니다(조합 없음). 치마는 맨다리 위에 입힙니다.
- 멈춤 감시(15분)·시간 예산이 있어 GPU 시간을 낭비하지 않습니다. 이전 Output을 Input으로 추가하면 이미 만든 조합은 건너뜁니다.
- 결과 zip을 받은 뒤: `node --env-file=.env.local scripts/publish-fitting-batch.mjs --dir <results 폴더>` (서비스 키는 로컬 `.env.local`에만).
