from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np
import pandas as pd

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

from run_skin_roi import (
    create_skin_roi_mask,
    calculate_color_stats
)


# =========================================================
# 경로
# =========================================================

PROJECT_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    PROJECT_DIR
    / "models"
    / "warm_cool_logistic.joblib"
)

LANDMARK_MODEL_PATH = (
    PROJECT_DIR
    / "models"
    / "face_landmarker.task"
)


# =========================================================
# 모델 입력 컬럼
# =========================================================

FEATURE_COLUMNS = [
    "lab_l",
    "lab_a",
    "lab_b",

    "lch_l",
    "lch_c",
    "lch_h",

    "hsv_h",
    "hsv_s",
    "hsv_v"
]


# =========================================================
# FastAPI 앱
# =========================================================

app = FastAPI(
    title="ONDO Personal Color API",
    version="1.0.0"
)


# =========================================================
# CORS 설정
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ondo-daily-style.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# 모델 확인
# =========================================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"학습 모델이 없습니다: {MODEL_PATH}"
    )

if not LANDMARK_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Face Landmarker 모델이 없습니다: "
        f"{LANDMARK_MODEL_PATH}"
    )


model = joblib.load(
    MODEL_PATH
)


# =========================================================
# 기본 확인 API
# =========================================================

@app.get("/")
def root():
    return {
        "service": "ONDO Personal Color API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": str(MODEL_PATH.name)
    }


# =========================================================
# 이미지 분석 API
# =========================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="파일 형식을 확인할 수 없습니다."
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="이미지 파일만 업로드할 수 있습니다."
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="빈 파일입니다."
        )

    # 업로드된 바이트를 OpenCV 이미지로 변환
    image_array = np.frombuffer(
        file_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="이미지를 읽을 수 없습니다."
        )

    # -----------------------------------------------------
    # MediaPipe Face Landmarker
    # -----------------------------------------------------

    try:
        rgb_image = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_image
        )

        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = (
            mp.tasks.vision.FaceLandmarkerOptions
        )
        RunningMode = mp.tasks.vision.RunningMode

        options = FaceLandmarkerOptions(
            base_options=BaseOptions(
                model_asset_path=str(
                    LANDMARK_MODEL_PATH
                )
            ),
            running_mode=RunningMode.IMAGE,
            num_faces=1
        )

        with FaceLandmarker.create_from_options(
            options
        ) as landmarker:

            result = landmarker.detect(mp_image)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"얼굴 랜드마크 처리 실패: {error}"
        )

    if not result.face_landmarks:
        raise HTTPException(
            status_code=422,
            detail="얼굴을 찾지 못했습니다."
        )

    # 첫 번째 얼굴 사용
    face_landmarks = result.face_landmarks[0]

    landmarks = [
        {
            "x": float(point.x),
            "y": float(point.y),
            "z": float(point.z)
        }
        for point in face_landmarks
    ]

    # -----------------------------------------------------
    # 피부 ROI 생성
    # -----------------------------------------------------

    try:
        mask = create_skin_roi_mask(
            image,
            landmarks
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"피부 ROI 생성 실패: {error}"
        )

    # -----------------------------------------------------
    # 색상 통계 계산
    # -----------------------------------------------------

    color_stats = calculate_color_stats(
        image,
        mask
    )

    if color_stats is None:
        raise HTTPException(
            status_code=422,
            detail="피부 ROI 영역을 계산하지 못했습니다."
        )

    # -----------------------------------------------------
    # 모델 입력값 생성
    # -----------------------------------------------------

    mean_lab = color_stats["mean_lab"]
    mean_lch = color_stats["mean_lch"]
    mean_hsv = color_stats["mean_hsv"]

    feature_row = {
        "lab_l": mean_lab[0],
        "lab_a": mean_lab[1],
        "lab_b": mean_lab[2],

        "lch_l": mean_lch[0],
        "lch_c": mean_lch[1],
        "lch_h": mean_lch[2],

        "hsv_h": mean_hsv[0],
        "hsv_s": mean_hsv[1],
        "hsv_v": mean_hsv[2]
    }

    X_new = pd.DataFrame(
        [feature_row],
        columns=FEATURE_COLUMNS
    )

    # -----------------------------------------------------
    # Warm/Cool 예측
    # -----------------------------------------------------

    prediction = model.predict(
        X_new
    )[0]

    probabilities = model.predict_proba(
        X_new
    )[0]

    probability_result = {
        str(label): float(probability)
        for label, probability in zip(
            model.classes_,
            probabilities
        )
    }

    return {
        "prediction": str(prediction),
        "probabilities": probability_result,
        "roi_pixel_count": color_stats[
            "roi_pixel_count"
        ],
        "color_stats": {
            "mean_lab": color_stats["mean_lab"],
            "mean_lch": color_stats["mean_lch"],
            "mean_hsv": color_stats["mean_hsv"]
        }
    }