from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


PROJECT_DIR = Path(__file__).resolve().parent

FEATURES_PATH = (
    PROJECT_DIR
    / "outputs"
    / "features.csv"
)

MODEL_PATH = (
    PROJECT_DIR
    / "models"
    / "warm_cool_logistic.joblib"
)

OUTPUT_PATH = (
    PROJECT_DIR
    / "outputs"
    / "per_image_predictions.csv"
)


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


# 데이터와 모델 불러오기
data = pd.read_csv(FEATURES_PATH)
model = joblib.load(MODEL_PATH)

data["label"] = (
    data["label"]
    .astype(str)
    .str.lower()
    .str.strip()
)

X = data[FEATURE_COLUMNS].astype(float)
y = data["label"]


# train_color_model.py와 동일한 분할
train_indices, test_indices = train_test_split(
    data.index,
    test_size=0.2,
    random_state=42,
    stratify=y
)

data["split"] = "train"
data.loc[test_indices, "split"] = "test"


# 이미지별 예측
predicted_labels = model.predict(X)
probabilities = model.predict_proba(X)


data["predicted_label"] = predicted_labels
data["prob_cool"] = probabilities[
    :, list(model.classes_).index("cool")
]
data["prob_warm"] = probabilities[
    :, list(model.classes_).index("warm")
]

data["correct"] = (
    data["label"]
    == data["predicted_label"]
)


# 결과 저장
output_columns = [
    "image",
    "label",
    "split",
    "predicted_label",
    "prob_cool",
    "prob_warm",
    "correct"
]

if "roi_pixel_count" in data.columns:
    output_columns.insert(
        2,
        "roi_pixel_count"
    )

result = data[output_columns].copy()

result.to_csv(
    OUTPUT_PATH,
    index=False,
    encoding="utf-8-sig"
)


# 전체 결과
all_accuracy = data["correct"].mean()

print()
print("====================================")
print("전체 이미지 예측 결과")
print("====================================")
print(
    f"전체 정확도: "
    f"{all_accuracy * 100:.2f}%"
)
print(
    f"맞힌 이미지: "
    f"{data['correct'].sum()} / {len(data)}"
)


# 테스트 데이터 결과
test_data = data[
    data["split"] == "test"
]

test_accuracy = test_data["correct"].mean()

print()
print("====================================")
print("테스트 이미지 예측 결과")
print("====================================")
print(
    f"테스트 정확도: "
    f"{test_accuracy * 100:.2f}%"
)
print(
    f"맞힌 테스트 이미지: "
    f"{test_data['correct'].sum()} / "
    f"{len(test_data)}"
)


# 틀린 이미지 출력
wrong_data = data[
    data["correct"] == False
]

print()
print("====================================")
print("잘못 분류된 이미지")
print("====================================")

if len(wrong_data) == 0:
    print("잘못 분류된 이미지가 없습니다.")

else:
    for _, row in wrong_data.iterrows():
        print(
            f"이미지: {row['image']}"
        )
        print(
            f"실제 라벨: {row['label']}"
        )
        print(
            f"예측 라벨: {row['predicted_label']}"
        )
        print(
            f"Cool 확률: "
            f"{row['prob_cool'] * 100:.2f}%"
        )
        print(
            f"Warm 확률: "
            f"{row['prob_warm'] * 100:.2f}%"
        )
        print(
            f"데이터 구분: {row['split']}"
        )
        print("------------------------------------")


print()
print(
    f"이미지별 결과 저장 완료: {OUTPUT_PATH}"
)