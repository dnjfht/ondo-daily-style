"""
ONDO 골격진단 사진 분석 API (로컬 전용)

실행:  python -m uvicorn app:app --host 127.0.0.1 --port 8000
요청:  POST http://127.0.0.1:8000/api/skeleton/analyze   (multipart/form-data, 필드명 image)
응답:  {"ok": true, "persona": {"p1":..., "axes":{"center":...}, "bodyLevel":..., "photoReasons":[...]}}
       → persona를 그대로 ONDO_SKELETON.diagnose(persona, answers)에 넣으면 된다.

개인정보: 127.0.0.1(이 컴퓨터)에서만 열리고, 받은 사진은 메모리에서 분석 후 바로 버린다(파일 저장 없음).
"""
import threading

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import skeleton_core as core

MAX_BYTES = 10 * 1024 * 1024
app = FastAPI(title="ONDO Skeleton API", version="skeleton-v3.3")
app.add_middleware(CORSMiddleware,
                   allow_origins=["https://ondo-daily-style.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_methods=["POST", "GET"], allow_headers=["*"])

_lm = core.load_landmarker()
_lock = threading.Lock()               # MediaPipe 인스턴스는 한 번에 한 요청만


@app.get("/api/skeleton/health")
def health():
    return {"ok": True, "version": core.PARAMS["version"]}


@app.post("/api/skeleton/analyze")
async def analyze(image: UploadFile = File(...)):
    data = await image.read()
    if not data:
        return JSONResponse({"ok": False, "error": "empty_file", "message": "사진 파일이 비어 있습니다."}, 400)
    if len(data) > MAX_BYTES:
        return JSONResponse({"ok": False, "error": "too_large", "message": "사진은 10MB 이하로 올려 주세요."}, 413)
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    del data
    if bgr is None:
        return JSONResponse({"ok": False, "error": "not_image",
                             "message": "이미지를 읽을 수 없습니다. JPG 또는 PNG로 올려 주세요."}, 400)
    try:
        with _lock:
            persona = core.analyze_bgr(_lm, bgr)
    except Exception:
        return JSONResponse({"ok": False, "error": "measure_failed",
                             "message": "몸의 윤곽을 재지 못했습니다. 머리부터 발끝까지 나온 정면 사진인지 확인해 주세요."}, 422)
    finally:
        del bgr
    if persona is not None and persona.get("error") == "not_full_body":
        return JSONResponse({"ok": False, "error": "not_full_body",
                             "message": "발끝이 보이지 않아요. 머리부터 발끝까지 전신이 나오게 다시 찍어 주세요."}, 422)
    if persona is None:
        return JSONResponse({"ok": False, "error": "no_person",
                             "message": "사람을 찾지 못했습니다. 정면 전신 사진을 올려 주세요."}, 422)
    if not persona["quality"]["ok"]:
        persona["photoReasons"].append("일부 관절이 잘 보이지 않아 사진 분석의 정확도가 낮을 수 있음")
    return {"ok": True, "persona": persona}
