# ONDO 골격진단 사진 분석 API (로컬 전용)

전신 사진 1장을 받아 골격 판정에 필요한 **사진 점수**(`p1`, `axes.center` 등)를 돌려주는 API입니다.
사이트의 `skeleton.js`(`ONDO_SKELETON.diagnose`)가 이 결과와 설문 답을 합쳐 최종 판정합니다.

- 주소: `http://127.0.0.1:8000` — **이 컴퓨터 안에서만** 열립니다 (외부 전송 없음)
- 사진은 메모리에서 분석한 뒤 바로 버립니다 (디스크 저장·로그 기록 없음)
- v3.2: 사람 부분만 잘라낸 뒤 세로 1300/1500/1700px × 좌우반전 = **6번 재서 평균** (압축·해상도에 따른 흔들림 절반 이하로)
- 사이트 인물 60장의 `personas.json`도 같은 코드로 계산 → 업로드 결과와 일치
- CORS 허용: `http://localhost:3000`, `http://127.0.0.1:3000`

## 1. 설치 (처음 한 번, Windows PowerShell)
```powershell
cd ondo_skeleton_api
py -3.11 -m venv .venv          # Python 3.9~3.12 필요 (mediapipe 지원 범위)
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. 실행 (사이트 테스트할 때마다)
```powershell
cd ondo_skeleton_api
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```
브라우저에서 `http://127.0.0.1:8000/api/skeleton/health` 를 열어 `{"ok":true,...}` 가 나오면 정상입니다.
사이트(`npm run dev`, 포트 3000)와 **동시에** 켜 두어야 합니다.

## 3. API 명세

### `POST /api/skeleton/analyze`
- 요청: `multipart/form-data`, 필드명 **`image`** (JPG/PNG, 10MB 이하, 정면 전신 사진)
- 성공 응답 (200):
```json
{
  "ok": true,
  "persona": {
    "p1": -0.545465,
    "axes": { "center": 0.427, "waist": 0.565, "frame": 1.0 },
    "bodyLevel": "중간",
    "photoReasons": ["골반 대비 어깨가 넓은 상체 중심 체형", "허리 굴곡이 적은 일자형"],
    "ratios": { "shoulder_hip": 1.078, "waist_hip": 0.864, "knee_thigh": 0.631, "shoulder_h": 0.27, "knee_h": 0.0821 },
    "quality": { "min_visibility": 0.967, "ok": true, "runs": 6, "p1_spread": 0.12,
                 "tips": ["몸이나 카메라가 기울어져 있어요. 카메라를 수평으로 들고 똑바로 서 주세요"] }
  }
}
```
- `persona`는 `personas.json`의 인물 항목과 같은 형식입니다. **그대로 `ONDO_SKELETON.diagnose(persona, answers)`에 넣으면 됩니다.**
- 실패 응답: `{"ok": false, "error": "<코드>", "message": "<사용자에게 보여줄 문구>"}`

| error | HTTP | 의미 |
|---|---|---|
| `empty_file` | 400 | 빈 파일 |
| `not_image` | 400 | 이미지가 아님 |
| `too_large` | 413 | 10MB 초과 |
| `no_person` | 422 | 사람을 찾지 못함 |
| `measure_failed` | 422 | 윤곽 측정 실패 (전신이 안 나온 사진 등) |
| `not_full_body` | 422 | 발끝이 안 보임 (전신 사진 아님) |

- `quality.tips`: 다시 찍으면 좋아지는 점 (발끝 잘림, 머리 위 여백, 사람이 너무 작음, 기울어짐, 팔이 몸에 붙음). 비어 있으면 촬영 상태 양호
- `quality.p1_spread`: 6번 잰 사진 점수의 표준편차. 화면에는 ×50 해서 "사진 % ±값"으로 표시

### `GET /api/skeleton/health`
`{"ok": true, "version": "skeleton-v3.2"}`

## 4. 사이트 연동 흐름
1. 사용자가 전신 사진을 올리면(선택) → `POST /api/skeleton/analyze` → `persona` 받기
2. 사진이 없거나 API가 실패하면 → `persona = { p1: 0, axes: { center: 0 }, photoReasons: [] }` (설문만으로 판정)
3. 설문 11문항 답 → `ONDO_SKELETON.diagnose(persona, answers)` → 결과 표시·저장
