from pathlib import Path
import json
import csv
import statistics


PROJECT_DIR = Path(__file__).resolve().parent

STATS_PATH = (
    PROJECT_DIR
    / "outputs"
    / "roi_stats.json"
)

FEATURES_PATH = (
    PROJECT_DIR
    / "outputs"
    / "features.csv"
)

SUMMARY_PATH = (
    PROJECT_DIR
    / "outputs"
    / "color_summary.json"
)


def safe_value(values, index):
    if not values:
        return None

    if len(values) <= index:
        return None

    return values[index]


def flatten_record(record):
    mean_lab = record.get("mean_lab", [])
    mean_lch = record.get("mean_lch", [])
    mean_hsv = record.get("mean_hsv", [])
    mean_rgb = record.get("mean_rgb", [])
    median_rgb = record.get("median_rgb", [])

    return {
        "image": record.get("image"),
        "label": record.get("label"),

        # ROI 면적
        "roi_pixel_count": record.get(
            "roi_pixel_count"
        ),

        # 평균 RGB
        "mean_r": safe_value(mean_rgb, 0),
        "mean_g": safe_value(mean_rgb, 1),
        "mean_b": safe_value(mean_rgb, 2),

        # 중앙값 RGB
        "median_r": safe_value(median_rgb, 0),
        "median_g": safe_value(median_rgb, 1),
        "median_b": safe_value(median_rgb, 2),

        # CIELAB
        "lab_l": safe_value(mean_lab, 0),
        "lab_a": safe_value(mean_lab, 1),
        "lab_b": safe_value(mean_lab, 2),

        # LCh
        "lch_l": safe_value(mean_lch, 0),
        "lch_c": safe_value(mean_lch, 1),
        "lch_h": safe_value(mean_lch, 2),

        # HSV
        "hsv_h": safe_value(mean_hsv, 0),
        "hsv_s": safe_value(mean_hsv, 1),
        "hsv_v": safe_value(mean_hsv, 2),
    }


def calculate_group_summary(rows):
    """
    Warm/Cool 그룹별 평균과 표준편차를 계산합니다.
    이 값은 모델 학습용이 아니라 데이터 분석용입니다.
    """

    summary = {}

    numeric_fields = [
        "roi_pixel_count",
        "lab_l",
        "lab_a",
        "lab_b",
        "lch_l",
        "lch_c",
        "lch_h",
        "hsv_h",
        "hsv_s",
        "hsv_v",
    ]

    labels = sorted(
        set(row["label"] for row in rows)
    )

    for label in labels:

        label_rows = [
            row
            for row in rows
            if row["label"] == label
        ]

        label_summary = {
            "image_count": len(label_rows),
            "features": {}
        }

        for field in numeric_fields:

            values = [
                float(row[field])
                for row in label_rows
                if row[field] is not None
            ]

            if not values:
                continue

            label_summary["features"][field] = {
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "std": (
                    statistics.pstdev(values)
                    if len(values) > 1
                    else 0.0
                )
            }

        summary[label] = label_summary

    return summary


def main():

    if not STATS_PATH.exists():
        print(
            f"파일이 없습니다: {STATS_PATH}"
        )
        return

    records = json.loads(
        STATS_PATH.read_text(
            encoding="utf-8"
        )
    )

    rows = [
        flatten_record(record)
        for record in records
    ]

    if not rows:
        print("ROI 통계 데이터가 없습니다.")
        return

    fieldnames = list(rows[0].keys())

    with FEATURES_PATH.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)

    summary = calculate_group_summary(rows)

    SUMMARY_PATH.write_text(
        json.dumps(
            summary,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print("특징 데이터 생성 완료")
    print(f"CSV 파일: {FEATURES_PATH}")
    print(f"그룹 통계: {SUMMARY_PATH}")


if __name__ == "__main__":
    main()