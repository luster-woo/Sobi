FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=Asia/Seoul \
    HF_HOME=/models

COPY requirements.txt .

# torch는 반드시 CPU 버전으로. 그냥 설치하면 CUDA가 딸려와 이미지가 6GB를 넘습니다.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# 진입점이 main.py 가 아니면 이 줄을 고쳐주세요 (예: app.main:app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
