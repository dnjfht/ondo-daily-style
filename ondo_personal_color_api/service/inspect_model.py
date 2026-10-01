from pathlib import Path
import joblib


PROJECT_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    PROJECT_DIR
    / "models"
    / "warm_cool_logistic.joblib"
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


model = joblib.load(MODEL_PATH)

print("모델 타입:")
print(type(model))

print()
print("Pipeline 구성:")
print(model.named_steps)

classifier = model.named_steps["classifier"]

print()
print("분류 클래스:")
print(classifier.classes_)

print()
print("절편:")
print(classifier.intercept_)

print()
print("특징별 계수:")
for feature, weight in zip(
    FEATURE_COLUMNS,
    classifier.coef_[0]
):
    print(f"{feature:10s}: {weight:.6f}")