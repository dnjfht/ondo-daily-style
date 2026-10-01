from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


# =========================================================
# 경로 설정
# =========================================================

PROJECT_DIR = Path(__file__).resolve().parent

FEATURES_PATH = (
    PROJECT_DIR
    / "outputs"
    / "features.csv"
)

MODEL_DIR = PROJECT_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# 사용할 색상 특징
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
# 데이터 불러오기
# =========================================================

if not FEATURES_PATH.exists():
    raise FileNotFoundError(
        f"features.csv가 없습니다: {FEATURES_PATH}"
    )

data = pd.read_csv(FEATURES_PATH)

print("전체 데이터 수:", len(data))
print("컬럼:", list(data.columns))


# 필요한 컬럼 확인
required_columns = FEATURE_COLUMNS + ["label"]

missing_columns = [
    column
    for column in required_columns
    if column not in data.columns
]

if missing_columns:
    raise ValueError(
        f"CSV에 다음 컬럼이 없습니다: {missing_columns}"
    )


# 결측값 제거
data = data.dropna(
    subset=required_columns
).copy()


# 라벨을 소문자로 통일
data["label"] = (
    data["label"]
    .astype(str)
    .str.lower()
    .str.strip()
)


# Warm/Cool 외의 라벨 확인
valid_labels = {"warm", "cool"}

invalid_labels = set(data["label"]) - valid_labels

if invalid_labels:
    raise ValueError(
        f"알 수 없는 라벨이 있습니다: {invalid_labels}"
    )


# 입력값과 정답값 분리
X = data[FEATURE_COLUMNS].astype(float)
y = data["label"]


# =========================================================
# 학습 데이터와 테스트 데이터 분리
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print()
print("학습 데이터:", len(X_train))
print("테스트 데이터:", len(X_test))


# =========================================================
# Logistic Regression 학습
# =========================================================

logistic_model = Pipeline([
    (
        "scaler",
        StandardScaler()
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=2000,
            random_state=42
        )
    )
])

logistic_model.fit(
    X_train,
    y_train
)

logistic_prediction = logistic_model.predict(
    X_test
)

logistic_accuracy = accuracy_score(
    y_test,
    logistic_prediction
)

print()
print("====================================")
print("Logistic Regression 결과")
print("====================================")
print("정확도:", logistic_accuracy)
print(
    classification_report(
        y_test,
        logistic_prediction
    )
)
print("혼동행렬:")
print(
    confusion_matrix(
        y_test,
        logistic_prediction
    )
)


LOGISTIC_MODEL_PATH = (
    MODEL_DIR
    / "warm_cool_logistic.joblib"
)

joblib.dump(
    logistic_model,
    LOGISTIC_MODEL_PATH
)

print(
    f"Logistic Regression 저장 완료: "
    f"{LOGISTIC_MODEL_PATH}"
)


# =========================================================
# SVM 학습
# =========================================================

svm_model = Pipeline([
    (
        "scaler",
        StandardScaler()
    ),
    (
        "classifier",
        SVC(
            kernel="rbf",
            probability=True,
            random_state=42
        )
    )
])

svm_model.fit(
    X_train,
    y_train
)

svm_prediction = svm_model.predict(
    X_test
)

svm_accuracy = accuracy_score(
    y_test,
    svm_prediction
)

print()
print("====================================")
print("SVM 결과")
print("====================================")
print("정확도:", svm_accuracy)
print(
    classification_report(
        y_test,
        svm_prediction
    )
)
print("혼동행렬:")
print(
    confusion_matrix(
        y_test,
        svm_prediction
    )
)


SVM_MODEL_PATH = (
    MODEL_DIR
    / "warm_cool_svm.joblib"
)

joblib.dump(
    svm_model,
    SVM_MODEL_PATH
)

print(
    f"SVM 저장 완료: "
    f"{SVM_MODEL_PATH}"
)


# =========================================================
# 더 높은 정확도 모델 안내
# =========================================================

print()
print("====================================")

if logistic_accuracy >= svm_accuracy:
    print("현재 테스트 정확도가 더 높은 모델: Logistic Regression")
else:
    print("현재 테스트 정확도가 더 높은 모델: SVM")

print("====================================")