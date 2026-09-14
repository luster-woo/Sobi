from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.rag.embedding import koe5

router = APIRouter(prefix="/rag", tags=["rag"])


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)
    kind: str = Field(default="passage", pattern="^(query|passage)$")


class EmbedResponse(BaseModel):
    dim: int
    vectors: list[list[float]]


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """디버그·적재용 임베딩 엔드포인트. 모델 추론은 스레드풀로 뺀다."""
    if req.kind == "query":
        vectors = [await run_in_threadpool(koe5.embed_query, req.texts[0])]
    else:
        vectors = await run_in_threadpool(koe5.embed_passages, req.texts)
    return EmbedResponse(dim=koe5.EMBEDDING_DIM, vectors=vectors)