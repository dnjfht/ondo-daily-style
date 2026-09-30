FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgomp1 libsm6 libxext6 libxrender1 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY ondo_skeleton_api/requirements.txt /tmp/skeleton-requirements.txt
COPY ondo_personal_color_api/service/requirements.txt /tmp/personal-color-requirements.txt
RUN pip install --no-cache-dir -r /tmp/skeleton-requirements.txt \
    && pip install --no-cache-dir -r /tmp/personal-color-requirements.txt

COPY ondo_skeleton_api/app.py ondo_skeleton_api/skeleton_core.py ondo_skeleton_api/params.json /app/skeleton/
COPY ondo_skeleton_api/models/pose_landmarker_heavy.task /app/skeleton/models/pose_landmarker_heavy.task
COPY ondo_personal_color_api/service/api.py ondo_personal_color_api/service/run_skin_roi.py /app/personal-color/
COPY ondo_personal_color_api/service/models/warm_cool_logistic.joblib /app/personal-color/models/warm_cool_logistic.joblib
COPY ondo_personal_color_api/service/models/face_landmarker.task /app/personal-color/models/face_landmarker.task

ENV ONDO_AI_SERVICE=skeleton

EXPOSE 10000

CMD ["sh", "-c", "if [ \"$ONDO_AI_SERVICE\" = \"personal-color\" ]; then cd /app/personal-color && uvicorn api:app --host 0.0.0.0 --port ${PORT:-10000}; else cd /app/skeleton && uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}; fi"]
