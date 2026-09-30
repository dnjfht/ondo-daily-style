FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# OpenCV/MediaPipe use these shared libraries when decoding and processing images.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgomp1 libsm6 libxext6 libxrender1 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py skeleton_core.py params.json ./
COPY models/pose_landmarker_heavy.task ./models/pose_landmarker_heavy.task

EXPOSE 10000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
