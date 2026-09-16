FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=Asia/Seoul \
    HF_HOME=/models

# 문서 정규화: HWP -> HWPX(Java), DOC -> DOCX(LibreOffice), 한글 폰트
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jre-headless \
    libreoffice-writer \
    fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch는 반드시 CPU 버전으로. 그냥 설치하면 CUDA가 딸려와 이미지가 6GB를 넘습니다.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# 진입점이 main.py 가 아니면 이 줄을 고쳐주세요 (예: app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
