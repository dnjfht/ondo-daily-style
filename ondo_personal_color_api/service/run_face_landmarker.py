from pathlib import Path
import json
import mediapipe as mp

# 프로젝트 기준 경로
PROJECT_DIR = Path(__file__).resolve().parent
DATASET_DIR = PROJECT_DIR / "dataset"
MODEL_PATH = PROJECT_DIR / "models" / "face_landmarker.task"
OUTPUT_DIR = PROJECT_DIR / "outputs"
OUTPUT_PATH = OUTPUT_DIR / "landmarks.json"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

OUTPUT_DIR.mkdir(exist_ok=True)

# MediaPipe 설정
BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
RunningMode = mp.tasks.vision.RunningMode

options = FaceLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=str(MODEL_PATH)
    ),
    running_mode=RunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
)

records = []

with FaceLandmarker.create_from_options(options) as landmarker:

    # warm, cool 폴더를 순회
    for class_dir in sorted(DATASET_DIR.iterdir()):

        if not class_dir.is_dir():
            continue

        # 폴더명이 라벨이 됨
        label = class_dir.name.lower()

        image_paths = sorted(
            path for path in class_dir.iterdir()
            if path.suffix.lower() in IMAGE_EXTENSIONS
        )

        for image_path in image_paths:

            record = {
                "image": image_path.name,
                "path": str(image_path),
                "label": label,
                "face_found": False,
                "landmarks": []
            }

            try:
                # 이미지 불러오기
                image = mp.Image.create_from_file(str(image_path))

                # 얼굴 랜드마크 실행
                result = landmarker.detect(image)

                # 얼굴을 찾은 경우
                if result.face_landmarks:
                    face_landmarks = result.face_landmarks[0]

                    record["face_found"] = True
                    record["landmarks"] = [
                        {
                            "x": float(point.x),
                            "y": float(point.y),
                            "z": float(point.z)
                        }
                        for point in face_landmarks
                    ]

                records.append(record)

                print(
                    f"[완료] {image_path.name} "
                    f"label={label}, "
                    f"face_found={record['face_found']}, "
                    f"landmarks={len(record['landmarks'])}"
                )

            except Exception as error:
                record["error"] = str(error)
                records.append(record)

                print(f"[오류] {image_path.name}: {error}")

# 결과 저장
OUTPUT_PATH.write_text(
    json.dumps(records, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

total = len(records)
found = sum(item["face_found"] for item in records)

print()
print(f"전체 이미지: {total}장")
print(f"얼굴 검출 성공: {found}장")
print(f"결과 저장: {OUTPUT_PATH}")