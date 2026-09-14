"""AI 서버 진입점. 파트별 라우터를 여기서만 조립한다."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.rag.embedding import koe5
from app.rag.router import router as rag_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # KoE5를 기동 시 미리 적재한다. 첫 요청이 2분 걸리는 것을 막는다.
    koe5.get_model()
    logger.info("기동 완료")
    yield


app = FastAPI(title="지원사업 AI 서버", lifespan=lifespan)
app.include_router(rag_router)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": koe5.is_loaded()}