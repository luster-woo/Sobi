# AI 서버

FastAPI 단일 서버. RAG(추천) · OCR · AGENT 세 파트가 한 프로세스에서 돕니다.

## 구조

```
ai/
├── app/
│   ├── main.py      # 진입점. 라우터 등록, 앱 시작 시 모델 1회 로드
│   ├── core/        # 공용: 설정, DB, GMS 클라이언트
│   ├── rag/         # 맞춤 추천 (KoE5 임베딩 + pgvector + GMS 검증)
│   │   ├── router.py
│   │   └── embedding/koe5.py
│   ├── ocr/         # OCR
│   └── agent/       # 에이전트 도구
├── pipeline/        # 공고문 적재 배치 (서버 이미지와 별개, EC2 밖 실행)
├── scripts/         # 일회성 검증 스크립트
├── data/            # 샘플·조사표 (raw/ 는 커밋 안 함)
└── docs/            # 사전 검증·조사 기록
```

## 규칙

- `rag/` `ocr/` `agent/` 는 서로 import 금지. 공용은 `core/`에만.
  파트 간 호출은 HTTP 엔드포인트로.
- uvicorn worker 1개 고정 (모델 중복 로드 방지). 모델 추론은 `run_in_threadpool`.
- 환경변수는 **저장소 루트** `.env` 하나만 사용 (`ai/.env` 없음).
  `load_dotenv(find_dotenv())` 로 읽습니다.
- `requirements.txt` 변경은 Jenkins 빌드를 트리거합니다.
- `torch`는 `requirements.txt`에 넣지 마세요. Dockerfile이 CPU 휠로 먼저 설치합니다.
  여기 적으면 CUDA 버전이 딸려와 이미지가 6GB를 넘습니다.

## 로컬 실행

```powershell
cd ai
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows에서는 반드시 `python run_dev.py` 로 띄우세요.**
`uvicorn app.main:app` 으로 직접 띄우면 DB 연결이 실패합니다.
uvicorn이 고르는 이벤트 루프를 psycopg가 지원하지 않아서인데,
`run_dev.py` 가 호환되는 루프로 바꿔줍니다. 리눅스·배포는 무관합니다.

첫 기동 때 KoE5 모델 2.2GB를 내려받습니다(5~10분). 이후로는 캐시를 씁니다.
확인은 <http://localhost:8000/docs> 에서.

### 환경변수

저장소 루트 `.env` 하나만 씁니다 (`ai/.env` 없음).

| 키 | 용도 |
|---|---|
| `POSTGRES_HOST` `PORT` `DB` `USER` `PASSWORD` | DB 접속 |
| `GMS_API_KEY` `GMS_BASE_URL` | LLM 호출 |
| `BIZINFO_API_KEY` | 기업마당 공고 수집 (배치 전용) |

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태 + 모델 적재 여부 |
| POST | `/rag/embed` | 텍스트 임베딩. `{"texts": [...], "kind": "query"\|"passage"}` → 1024차원 |

`/rag/search`, `/rag/recommend` 는 작업 중입니다.

## 임베딩 모델

`nlpai-lab/KoE5` — 1024차원, 최대 512토큰, CPU 상주 약 2.6GB.

**`query: ` / `passage: ` 프리픽스가 필수인 모델입니다.** 검색 질의에는 `query:`,
색인할 문서에는 `passage:` 를 붙여야 제 성능이 납니다. 이 프리픽스는
`app/rag/embedding/koe5.py` 안에서만 붙입니다 — 호출부는 원문만 넘기세요.
`embed_query()` / `embed_passages()` 두 함수만 쓰면 됩니다.

벡터는 정규화해서 내보냅니다(`normalize_embeddings=True`). pgvector의
코사인 거리 연산자 `<=>` 와 맞추기 위함입니다.

KURE-v1 과의 비교 근거는 `docs/00_precheck.md` 참고. 재현은
`python scripts/compare_embed.py koe5|kure`.

## 배포 시 주의

Dockerfile이 `HF_HOME=/models` 로 모델 캐시 위치를 지정합니다. 이 경로가
**볼륨으로 마운트되지 않으면 컨테이너가 뜰 때마다 2.2GB를 새로 내려받습니다.**
볼륨을 붙이거나, 빌드 단계에서 모델을 이미지에 구워야 합니다.