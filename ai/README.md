# AI 서버

FastAPI 단일 서버. RAG(추천) · OCR · AGENT 세 파트가 한 프로세스에서 돕니다.

## 구조

```
ai/
├── main.py          # 진입점. 라우터 등록, 앱 시작 시 모델 1회 로드
├── app/
│   ├── core/        # 공용: 설정, DB, GMS 클라이언트
│   ├── rag/         # 맞춤 추천 (KoE5 임베딩 + pgvector + GMS 검증)
│   ├── ocr/         # OCR
│   └── agent/       # 에이전트 도구
├── pipeline/        # 공고문 적재 배치 (서버 이미지와 별개, EC2 밖 실행)
├── scripts/         # 일회성 검증 스크립트
└── data/            # 샘플·조사표 (raw/ 는 커밋 안 함)
```

## 규칙

- `rag/` `ocr/` `agent/` 는 서로 import 금지. 공용은 `core/`에만.
  파트 간 호출은 HTTP 엔드포인트로.
- uvicorn worker 1개 고정 (모델 중복 로드 방지). 모델 추론은 `run_in_threadpool`.
- 환경변수는 루트 `.env` 하나만 사용 (`ai/.env` 없음).
- `requirements.txt`가 생기면 Jenkins가 빌드를 시작함. 서버 뼈대와 함께 추가.

## 로컬 실행

```powershell
cd ai
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --reload
```