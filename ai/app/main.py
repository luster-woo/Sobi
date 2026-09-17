"""AI 서버 진입점. 파트별 라우터를 여기서만 조립한다."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core import db
from app.rag.embedding import koe5
from app.rag.router import router as rag_router
from app.agent.documents.preprocessing_batch.router import router as preprocessing_batch_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# 라이브러리 내부 로그는 경고만. HF 허브 캐시 확인 요청이 기동 로그를 덮는다.
for _noisy in ("httpx", "httpcore", "urllib3", "sentence_transformers", "transformers"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.open_pool()
    koe5.get_model()
    logger.info("기동 완료")
    yield
    await db.close_pool()


app = FastAPI(title="지원사업 AI 서버", lifespan=lifespan)
app.include_router(rag_router)
app.include_router(preprocessing_batch_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": koe5.is_loaded(),
        "db": await db.ping(),
    }