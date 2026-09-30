from pathlib import Path
import json

import cv2
import numpy as np


# =========================================================
# 경로 설정
# =========================================================

PROJECT_DIR = Path(__file__).resolve().parent

DATASET_DIR = PROJECT_DIR / "dataset"
LANDMARKS_PATH = PROJECT_DIR / "outputs" / "landmarks.json"

ROI_IMAGE_DIR = PROJECT_DIR / "outputs" / "roi_images"
ROI_MASK_DIR = PROJECT_DIR / "outputs" / "roi_masks"
STATS_PATH = PROJECT_DIR / "outputs" / "roi_stats.json"

ROI_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
ROI_MASK_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# 얼굴 외곽선
# =========================================================

FACE_OVAL = [
    10, 338, 297, 332, 284, 251,
    389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109
]


# =========================================================
# 눈, 눈썹, 코 랜드마크
# =========================================================

FEATURE_GROUPS = {
    "left_eye": [
        33, 133, 160, 159, 158, 157,
        173, 144, 145, 153, 154, 155
    ],

    "right_eye": [
        362, 263, 387, 386, 385, 384,
        398, 373, 374, 380, 381, 382
    ],

    "left_eyebrow": [
        70, 63, 105, 66, 107,
        55, 65, 52, 53
    ],

    "right_eyebrow": [
        300, 293, 334, 296, 336,
        285, 295, 282, 283
    ],

    "nose": [
        1, 2, 4, 5, 6, 19,
        48, 64, 98, 168, 195,
        197, 236, 278, 294, 327, 331
    ]
}


# =========================================================
# 입술 랜드마크
# =========================================================

# 실제 윗입술 외곽
# 왼쪽 입꼬리 → 윗입술 위쪽 → 오른쪽 입꼬리
UPPER_LIP_OUTER = [
    61, 185, 40, 39, 37, 0,
    267, 269, 270, 409, 291
]


# 윗입술 안쪽 경계
# 오른쪽 입꼬리 → 윗입술 안쪽 → 왼쪽 입꼬리
UPPER_LIP_INNER_RIGHT_TO_LEFT = [
    308, 415, 310, 311, 312, 13,
    82, 81, 80, 191, 78
]


# 아랫입술 외곽
LOWER_LIP_OUTER = [
    61, 146, 91, 181, 84, 17,
    314, 405, 321, 375, 291
]


# 아랫입술 안쪽 경계
LOWER_LIP_INNER_RIGHT_TO_LEFT = [
    308, 324, 318, 402, 317, 14,
    87, 178, 88, 95, 78
]


# 윗입술을 위쪽으로 확장하는 정도
# 얼굴 높이의 5.5%만큼 인중 방향으로 확장
UPPER_LIP_EXTRA_UP_RATIO = 0.055


# =========================================================
# 이미지 찾기
# =========================================================

def find_image(record):
    label = str(record.get("label", ""))
    image_name = Path(str(record.get("image", ""))).name

    # landmarks.json에 저장된 기존 경로 확인
    original_path = record.get("path")

    if original_path:
        original_path = Path(original_path)

        if original_path.exists():
            return original_path

    # dataset/Warm 또는 dataset/Cool에서 찾기
    if not DATASET_DIR.exists():
        return None

    for folder in DATASET_DIR.iterdir():

        if not folder.is_dir():
            continue

        if folder.name.lower() != label.lower():
            continue

        image_path = folder / image_name

        if image_path.exists():
            return image_path

    return None


# =========================================================
# 랜드마크를 픽셀 좌표로 변환
# =========================================================

def landmarks_to_pixels(image, landmarks):
    height, width = image.shape[:2]

    points = []

    for landmark in landmarks:

        x = float(landmark["x"])
        y = float(landmark["y"])

        pixel_x = int(round(x * width))
        pixel_y = int(round(y * height))

        pixel_x = max(0, min(width - 1, pixel_x))
        pixel_y = max(0, min(height - 1, pixel_y))

        points.append([pixel_x, pixel_y])

    return np.asarray(points, dtype=np.int32)


# =========================================================
# 마스크 확장 및 제거
# =========================================================

def erase_layer(mask, layer, pad_x=0, pad_y=0):
    """
    원래 다각형 모양을 유지한 채 x/y 방향으로 확장하여 제거합니다.
    """

    pad_x = max(0, int(pad_x))
    pad_y = max(0, int(pad_y))

    kernel_width = pad_x * 2 + 1
    kernel_height = pad_y * 2 + 1

    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (kernel_width, kernel_height)
    )

    expanded_layer = cv2.dilate(
        layer,
        kernel,
        iterations=1
    )

    mask[expanded_layer > 0] = 0


def erase_feature_group(
    mask,
    points,
    indices,
    face_width,
    face_height,
    padding_x_ratio=0.012,
    padding_y_ratio=0.012
):
    """
    눈, 눈썹, 코를 랜드마크 모양으로 제거합니다.
    """

    feature_points = points[indices]

    if len(feature_points) < 3:
        return

    feature_hull = cv2.convexHull(
        feature_points.astype(np.int32)
    )

    feature_layer = np.zeros_like(mask)

    cv2.fillConvexPoly(
        feature_layer,
        feature_hull,
        255
    )

    erase_layer(
        mask,
        feature_layer,
        pad_x=int(face_width * padding_x_ratio),
        pad_y=int(face_height * padding_y_ratio)
    )


# =========================================================
# 입술 영역 제거
# =========================================================

def erase_lips(mask, points, face_width, face_height):
    """
    윗입술과 아랫입술을 각각 실제 입술 모양으로 제거합니다.

    윗입술 외곽은 위쪽으로 확장하여
    인중 피부 일부도 함께 제거합니다.
    """

    # -----------------------------------------------------
    # 1. 윗입술 외곽선 복사
    # -----------------------------------------------------

    upper_outer = points[
        UPPER_LIP_OUTER
    ].copy()

    upper_inner = points[
        UPPER_LIP_INNER_RIGHT_TO_LEFT
    ].copy()

    # -----------------------------------------------------
    # 2. 윗입술 외곽을 인중 방향으로 확장
    # -----------------------------------------------------

    extra_up = int(
        face_height * UPPER_LIP_EXTRA_UP_RATIO
    )

    upper_outer[:, 1] -= extra_up

    # 이미지 바깥으로 나가지 않도록 제한
    upper_outer[:, 1] = np.maximum(
        upper_outer[:, 1],
        0
    )

    # 윗입술 외곽과 안쪽 경계 연결
    upper_lip_polygon = np.vstack([
        upper_outer,
        upper_inner
    ]).astype(np.int32)

    upper_lip_layer = np.zeros_like(mask)

    cv2.fillPoly(
        upper_lip_layer,
        [upper_lip_polygon],
        255
    )

    # 윗입술 영역을 추가로 조금 확장
    erase_layer(
        mask,
        upper_lip_layer,
        pad_x=int(face_width * 0.015),
        pad_y=int(face_height * 0.012)
    )

    # -----------------------------------------------------
    # 3. 아랫입술 영역 생성
    # -----------------------------------------------------

    lower_outer = points[
        LOWER_LIP_OUTER
    ].copy()

    lower_inner = points[
        LOWER_LIP_INNER_RIGHT_TO_LEFT
    ].copy()

    lower_lip_polygon = np.vstack([
        lower_outer,
        lower_inner
    ]).astype(np.int32)

    lower_lip_layer = np.zeros_like(mask)

    cv2.fillPoly(
        lower_lip_layer,
        [lower_lip_polygon],
        255
    )

    erase_layer(
        mask,
        lower_lip_layer,
        pad_x=int(face_width * 0.012),
        pad_y=int(face_height * 0.012)
    )


# =========================================================
# 피부 ROI 마스크 생성
# =========================================================

def create_skin_roi_mask(image, landmarks):

    points = landmarks_to_pixels(
        image,
        landmarks
    )

    required_indices = (
        FACE_OVAL
        + UPPER_LIP_OUTER
        + UPPER_LIP_INNER_RIGHT_TO_LEFT
        + LOWER_LIP_OUTER
        + LOWER_LIP_INNER_RIGHT_TO_LEFT
        + [
            index
            for group in FEATURE_GROUPS.values()
            for index in group
        ]
    )

    max_required_index = max(required_indices)

    if len(points) <= max_required_index:
        raise ValueError(
            f"랜드마크 개수가 부족합니다. "
            f"현재 {len(points)}개, "
            f"필요 {max_required_index + 1}개"
        )

    height, width = image.shape[:2]

    face_oval_points = points[FACE_OVAL]

    _, _, face_width, face_height = cv2.boundingRect(
        face_oval_points
    )

    mask = np.zeros(
        (height, width),
        dtype=np.uint8
    )

    # -----------------------------------------------------
    # 1. 얼굴 외곽선 안쪽을 피부 후보 영역으로 설정
    # -----------------------------------------------------

    cv2.fillPoly(
        mask,
        [face_oval_points],
        255
    )

    # -----------------------------------------------------
    # 2. 눈, 눈썹, 코 제거
    # -----------------------------------------------------

    for feature_name, indices in FEATURE_GROUPS.items():

        if feature_name in [
            "left_eye",
            "right_eye"
        ]:
            padding_x_ratio = 0.015
            padding_y_ratio = 0.015

        elif feature_name in [
            "left_eyebrow",
            "right_eyebrow"
        ]:
            padding_x_ratio = 0.020
            padding_y_ratio = 0.020

        elif feature_name == "nose":
            padding_x_ratio = 0.020
            padding_y_ratio = 0.020

        else:
            padding_x_ratio = 0.012
            padding_y_ratio = 0.012

        erase_feature_group(
            mask=mask,
            points=points,
            indices=indices,
            face_width=face_width,
            face_height=face_height,
            padding_x_ratio=padding_x_ratio,
            padding_y_ratio=padding_y_ratio
        )

    # -----------------------------------------------------
    # 3. 입술 제거
    # -----------------------------------------------------

    erase_lips(
        mask=mask,
        points=points,
        face_width=face_width,
        face_height=face_height
    )

    # -----------------------------------------------------
    # 4. 얼굴 외곽 가장자리 제거
    # -----------------------------------------------------

    border_size = max(
        1,
        int(min(face_width, face_height) * 0.008)
    )

    border_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (
            border_size * 2 + 1,
            border_size * 2 + 1
        )
    )

    mask = cv2.erode(
        mask,
        border_kernel,
        iterations=1
    )

    return mask


# =========================================================
# 색상 통계 계산
# =========================================================

def calculate_color_stats(image, mask):

    pixels_bgr = image[mask > 0]

    if len(pixels_bgr) == 0:
        return None

    # BGR → RGB
    pixels_rgb = pixels_bgr[:, ::-1].astype(
        np.float32
    )

    mean_rgb = pixels_rgb.mean(axis=0)
    median_rgb = np.median(pixels_rgb, axis=0)

    # -----------------------------------------------------
    # CIELAB
    # -----------------------------------------------------

    rgb_image = pixels_rgb.reshape(
        -1, 1, 3
    ).astype(np.uint8)

    lab_image = cv2.cvtColor(
        rgb_image,
        cv2.COLOR_RGB2LAB
    )

    lab_pixels = lab_image.reshape(
        -1, 3
    ).astype(np.float32)

    lab_l = lab_pixels[:, 0] * (
        100.0 / 255.0
    )

    lab_a = lab_pixels[:, 1] - 128.0
    lab_b = lab_pixels[:, 2] - 128.0

    mean_lab = [
        float(np.mean(lab_l)),
        float(np.mean(lab_a)),
        float(np.mean(lab_b))
    ]

    # -----------------------------------------------------
    # LCh
    # -----------------------------------------------------

    chroma = np.sqrt(
        (lab_a ** 2) +
        (lab_b ** 2)
    )

    hue = np.degrees(
        np.arctan2(lab_b, lab_a)
    )

    hue = np.mod(hue, 360.0)

    mean_lch = [
        float(np.mean(lab_l)),
        float(np.mean(chroma)),
        float(np.mean(hue))
    ]

    # -----------------------------------------------------
    # HSV
    # -----------------------------------------------------

    hsv_image = cv2.cvtColor(
        rgb_image,
        cv2.COLOR_RGB2HSV
    )

    hsv_pixels = hsv_image.reshape(
        -1, 3
    ).astype(np.float32)

    hsv_h = hsv_pixels[:, 0] * 2.0
    hsv_s = hsv_pixels[:, 1]
    hsv_v = hsv_pixels[:, 2]

    mean_hsv = [
        float(np.mean(hsv_h)),
        float(np.mean(hsv_s)),
        float(np.mean(hsv_v))
    ]

    return {
        "roi_pixel_count": int(len(pixels_rgb)),

        "mean_rgb": [
            float(value)
            for value in mean_rgb
        ],

        "median_rgb": [
            float(value)
            for value in median_rgb
        ],

        "mean_lab": mean_lab,
        "mean_lch": mean_lch,
        "mean_hsv": mean_hsv
    }


# =========================================================
# 실행
# =========================================================

def main():

    if not LANDMARKS_PATH.exists():
        print(
            f"landmarks.json이 없습니다: "
            f"{LANDMARKS_PATH}"
        )
        return

    records = json.loads(
        LANDMARKS_PATH.read_text(
            encoding="utf-8"
        )
    )

    roi_results = []

    for index, record in enumerate(
        records,
        start=1
    ):

        image_name = record.get(
            "image",
            "이름 없음"
        )

        label = record.get(
            "label",
            "unknown"
        )

        # 얼굴을 찾지 못한 경우
        if not record.get("face_found"):
            print(
                f"[{index}/{len(records)}] "
                f"얼굴 없음: {image_name}"
            )
            continue

        landmarks = record.get(
            "landmarks"
        )

        if not landmarks:
            print(
                f"[{index}/{len(records)}] "
                f"랜드마크 없음: {image_name}"
            )
            continue

        # 이미지 찾기
        image_path = find_image(record)

        if image_path is None:
            print(
                f"[{index}/{len(records)}] "
                f"이미지 없음: {image_name}"
            )
            continue

        # 이미지 읽기
        image = cv2.imread(
            str(image_path)
        )

        if image is None:
            print(
                f"[{index}/{len(records)}] "
                f"이미지 읽기 실패: {image_path}"
            )
            continue

        try:
            mask = create_skin_roi_mask(
                image,
                landmarks
            )

        except Exception as error:
            print(
                f"[{index}/{len(records)}] "
                f"ROI 생성 실패: {image_name}"
            )
            print(f"오류 내용: {error}")
            continue

        # -------------------------------------------------
        # ROI 이미지만 남기기
        # -------------------------------------------------

        roi_image = np.zeros_like(image)
        roi_image[mask > 0] = image[mask > 0]

        # -------------------------------------------------
        # 미리보기 이미지
        # -------------------------------------------------

        preview = image.copy()

        outside_pixels = mask == 0

        preview[outside_pixels] = (
            preview[outside_pixels].astype(
                np.float32
            ) * 0.22
        ).astype(np.uint8)

        # -------------------------------------------------
        # 색상 통계 계산
        # -------------------------------------------------

        color_stats = calculate_color_stats(
            image,
            mask
        )

        if color_stats is None:
            print(
                f"[{index}/{len(records)}] "
                f"ROI 픽셀 없음: {image_name}"
            )
            continue

        # 동일한 파일명 방지
        stem = image_path.stem
        safe_stem = f"{label}_{stem}"

        roi_image_path = (
            ROI_IMAGE_DIR /
            f"{safe_stem}_roi.png"
        )

        preview_path = (
            ROI_IMAGE_DIR /
            f"{safe_stem}_preview.png"
        )

        mask_path = (
            ROI_MASK_DIR /
            f"{safe_stem}_mask.png"
        )

        # 결과 이미지 저장
        cv2.imwrite(
            str(roi_image_path),
            roi_image
        )

        cv2.imwrite(
            str(preview_path),
            preview
        )

        cv2.imwrite(
            str(mask_path),
            mask
        )

        # 통계 저장
        roi_results.append({
            "image": image_name,
            "label": label,
            "image_path": str(image_path),
            "roi_image_path": str(roi_image_path),
            "preview_path": str(preview_path),
            "mask_path": str(mask_path),
            **color_stats
        })

        print(
            f"[{index}/{len(records)}] "
            f"완료: {label}/{image_name}"
        )

    # -----------------------------------------------------
    # 최종 JSON 저장
    # -----------------------------------------------------

    STATS_PATH.write_text(
        json.dumps(
            roi_results,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print()
    print("====================================")
    print(f"ROI 처리 완료: {len(roi_results)}장")
    print(f"ROI 이미지: {ROI_IMAGE_DIR}")
    print(f"ROI 마스크: {ROI_MASK_DIR}")
    print(f"색상 통계: {STATS_PATH}")
    print("====================================")


if __name__ == "__main__":
    main()