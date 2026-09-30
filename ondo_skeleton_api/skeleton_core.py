"""
ONDO 골격진단 사진 분석 코어 (step4 측정 + step5 살집 보정 + step6 축 + step7 1단계 사진 점수) — v3.2
연구용 스크립트(step4~9)와 같은 계산을 한 파일로 묶은 것. 값은 params.json에서 읽는다.
"""
import json
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

HERE = Path(__file__).parent
PARAMS = json.loads((HERE / "params.json").read_text(encoding="utf-8"))
THICK = 50


def load_landmarker():
    opts = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(HERE / "models" / "pose_landmarker_heavy.task")),
        running_mode=vision.RunningMode.IMAGE, output_segmentation_masks=True)
    return vision.PoseLandmarker.create_from_options(opts)


def width_at(mask, y, cx):
    row = mask[y]
    x0 = x1 = cx
    while x0 > 0 and row[x0 - 1]:
        x0 -= 1
    while x1 < len(row) - 1 and row[x1 + 1]:
        x1 += 1
    return x0, x1, x1 - x0 + 1


def measure(bgr, res):
    h, w = bgr.shape[:2]
    lm = res.pose_landmarks[0]
    px = lambda i: (int(lm[i].x * w), int(lm[i].y * h))
    mask = (res.segmentation_masks[0].numpy_view() > 0.5).astype(np.uint8).squeeze()
    thick = max(1, int(round(THICK * h / 1500)))          # 팔 지우기 굵기: 세로 1500px 기준 50px

    arm = np.zeros_like(mask)
    for el, wr, idx in [(13, 15, 19), (14, 16, 20)]:
        cv2.line(arm, px(el), px(wr), 1, thick)
        tip = (px(wr)[0] + 2 * (px(idx)[0] - px(wr)[0]), px(wr)[1] + 2 * (px(idx)[1] - px(wr)[1]))
        cv2.line(arm, px(wr), tip, 1, thick)
    body = mask & (1 - arm)

    ys = np.where(mask.any(axis=1))[0]
    height = ys.max() - ys.min()
    sh_y = (px(11)[1] + px(12)[1]) // 2
    shoulder = width_at(mask, sh_y, (px(11)[0] + px(12)[0]) // 2)[2]
    hip_y = (px(23)[1] + px(24)[1]) // 2
    hp_x0, hp_x1, hip = width_at(body, hip_y, (px(23)[0] + px(24)[0]) // 2)
    cx = (px(11)[0] + px(12)[0] + px(23)[0] + px(24)[0]) // 4
    torso = hip_y - sh_y
    waist = min(width_at(body, y, cx)[2]
                for y in range(int(sh_y + 0.35 * torso), int(hip_y - 0.05 * torso)))
    knee_y = (px(25)[1] + px(26)[1]) // 2
    thigh_y = int(hip_y + 0.25 * (knee_y - hip_y))
    lx0, lx1, _ = width_at(body, thigh_y, px(23)[0])
    rx0, rx1, _ = width_at(body, thigh_y, px(24)[0])
    m = int(0.05 * hip)
    tx0, tx1 = max(min(lx0, rx0), hp_x0 - m), min(max(lx1, rx1), hp_x1 + m)
    thigh = tx1 - tx0 + 1
    knee = sum(width_at(body, px(k)[1], px(k)[0])[2] for k in (25, 26)) / 2
    knee_mask = sum(width_at(mask, int(lm[k].y * h), int(lm[k].x * w))[2] for k in (25, 26)) / 2
    return {
        "shoulder_hip": round(shoulder / hip, 3),
        "waist_hip": round(waist / hip, 3),
        "knee_thigh": round(knee / (thigh / 2), 3),
        "shoulder_h": round(float(shoulder / height), 3),
        "knee_h": round(float(knee_mask / height), 4),
    }


def correct(f):
    P = PARAMS["bodymass"]
    dx = max(0.0, f["knee_h"] - P["ref"])     # 기준보다 살집이 많은 사진만 보정 (v3.1)
    c = dict(f)
    for k, s in P["slopes"].items():
        c[k] = round(f[k] - s * dx, 3)
    return c


def body_level(f):
    lo, hi = PARAMS["bodymass"]["level_cut"]
    return "슬림" if f["knee_h"] < lo else ("중간" if f["knee_h"] < hi else "살집")


def z(f, k):
    m, sd = PARAMS["stats"][k]
    return float(np.clip((f[k] - m) / sd, -1, 1))


def photo_reasons(center, waist, frame, level):
    r = []
    if center >= 0.3:
        r.append("골반 대비 어깨가 넓은 상체 중심 체형")
    elif center <= -0.3:
        r.append("골반 대비 어깨가 좁은 하체 중심 체형")
    if waist >= 0.3:
        r.append("허리 굴곡이 적은 일자형")
    elif waist <= -0.3:
        r.append("허리가 잘록한 곡선형")
    if frame >= 0.3 and level == "슬림":
        r.append("키 대비 어깨 프레임이 큰 편")
    elif frame <= -0.3:
        r.append("키 대비 어깨 프레임이 가녀린 편")
    if not r:
        r.append("정면 사진에서 뚜렷하게 치우친 특징이 없음")
    return r


SCALES = (1300, 1500, 1700)       # 세 가지 크기 × 좌우 반전 = 6번 재서 평균 (v3.2 흔들림 줄이기)
RATIO_KEYS = ("shoulder_hip", "waist_hip", "knee_thigh", "shoulder_h", "knee_h")


def _detect(landmarker, bgr, H, flip):
    s = H / bgr.shape[0]
    b = cv2.resize(bgr, (int(round(bgr.shape[1] * s)), H),
                   interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA)
    if flip:
        b = cv2.flip(b, 1)
    pad = (-b.shape[1]) % 4                                 # 가로 4의 배수 (MediaPipe 오류 방지)
    if pad:
        b = cv2.copyMakeBorder(b, 0, 0, 0, pad, cv2.BORDER_REPLICATE)
    res = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB,
                                     data=cv2.cvtColor(b, cv2.COLOR_BGR2RGB)))
    return b, res


def p1_of(c, level):
    center, waist, frame = z(c, "shoulder_hip"), z(c, "waist_hip"), z(c, "shoulder_h")
    t = PARAMS["frame_trust"][level]
    W = PARAMS.get("photo_weights", {"center": 25, "waist": 12, "frame": 10})
    a, b, c = W["center"], W["waist"], W["frame"] * t
    return center, waist, frame, (a * (-center) + b * (-waist) + c * (-frame)) / (a + b + c)


def shooting_tips(res, shape):
    """촬영 상태 점검 → 다시 찍으면 좋아지는 점 (판정에는 쓰지 않음)"""
    h, w = shape
    lm = res.pose_landmarks[0]
    tips = []
    if min(lm[i].visibility for i in (27, 28)) < 0.5 or max(lm[27].y, lm[28].y) > 0.98:
        tips.append("발끝까지 나오게 찍어 주세요")
    if min(lm[i].y for i in (0, 11, 12)) < 0.02:
        tips.append("머리 위쪽에 여백을 두고 찍어 주세요")
    top = min(lm[i].y for i in (0, 11, 12)); bottom = max(lm[27].y, lm[28].y)
    if bottom - top < 0.55:
        tips.append("사람이 사진에서 너무 작아요. 전신이 화면 세로를 가득 채우게 찍어 주세요")
    mx_s, my_s = (lm[11].x + lm[12].x) / 2 * w, (lm[11].y + lm[12].y) / 2 * h
    mx_h, my_h = (lm[23].x + lm[24].x) / 2 * w, (lm[23].y + lm[24].y) / 2 * h
    tilt = abs(np.degrees(np.arctan2(mx_s - mx_h, my_h - my_s)))
    if tilt > 4 or abs(lm[11].y - lm[12].y) * h > 0.04 * (my_h - my_s) * 3:
        tips.append("몸이나 카메라가 기울어져 있어요. 카메라를 수평으로 들고 똑바로 서 주세요")
    for wr, hip in ((15, 23), (16, 24)):
        if abs(lm[wr].x - lm[hip].x) < 0.03:
            tips.append("팔이 몸에 붙어 있어요. 팔을 몸에서 주먹 하나만큼 떼 주세요")
            break
    return tips


def analyze_bgr(landmarker, bgr):
    """BGR 이미지 → 사이트 skeleton.js가 쓰는 persona 형식의 사진 분석 결과. 사람이 없으면 None

    v3.2: 사진 한 장을 세로 1300/1500/1700px × 원본/좌우반전 = 6번 재서 비율을 평균한다.
    (압축·해상도에 따라 윤곽 인식이 조금씩 달라지는 흔들림을 줄이기 위함)
    """
    # 사람 크기 맞추기: 먼저 한 번 찾아서 사람 부분만 잘라낸다 (여백이 많거나 멀리서 찍은 사진도 같은 조건으로 재기)
    b0, r0 = _detect(landmarker, bgr, 1500, False)
    if not r0.pose_landmarks:
        return None
    tips = shooting_tips(r0, b0.shape[:2])
    feet_vis = min(r0.pose_landmarks[0][i].visibility for i in (27, 28))
    if feet_vis < 0.5:
        return {"error": "not_full_body"}
    s0 = bgr.shape[0] / 1500
    xs = [l.x * b0.shape[1] * s0 for l in r0.pose_landmarks[0]]
    ys = [l.y * b0.shape[0] * s0 for l in r0.pose_landmarks[0]]
    ph = max(ys) - min(ys)                                   # 사람 키(픽셀, 원본 기준)
    y0 = int(max(0, min(ys) - 0.18 * ph)); y1 = int(min(bgr.shape[0], max(ys) + 0.06 * ph))
    cxp = (min(xs) + max(xs)) / 2; half = max((max(xs) - min(xs)) / 2 + 0.25 * ph, 0.35 * ph)
    x0 = int(max(0, cxp - half)); x1 = int(min(bgr.shape[1], cxp + half))
    bgr = bgr[y0:y1, x0:x1]

    feats, runs, first = [], [], None
    for H in SCALES:
        for flip in (False, True):
            b, res = _detect(landmarker, bgr, H, flip)
            if not res.pose_landmarks:
                continue
            try:
                f = measure(b, res)
            except Exception:
                continue
            feats.append(f)
            if first is None:
                first = (res, b.shape[:2])
    if not feats:
        return None
    f = {k: round(float(np.mean([x[k] for x in feats])), 4 if k == "knee_h" else 3) for k in RATIO_KEYS}
    level = body_level(f)
    center, waist, frame, p1 = p1_of(correct(f), level)
    center, waist, frame = round(center, 3), round(waist, 3), round(frame, 3)
    each = [p1_of(correct(x), level)[3] for x in feats]    # 한 번씩 잰 값의 흔들림 (신뢰도 표시용)
    res, shape = first
    vis = min(res.pose_landmarks[0][i].visibility for i in (11, 12, 23, 24, 25, 26, 27, 28))
    return {
        "p1": round(p1, 6),
        "axes": {"center": center, "waist": waist, "frame": frame},
        "bodyLevel": level,
        "photoReasons": photo_reasons(center, waist, frame, level),
        "ratios": f,
        "quality": {"min_visibility": round(float(vis), 3), "ok": bool(vis >= 0.5),
                    "runs": len(feats), "p1_spread": round(float(np.std(each)), 3),
                    "tips": tips},
    }
