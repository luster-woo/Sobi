from datetime import date


from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.rag.embedding import koe5
from app.rag import search as rag_search
from app.rag import recommend as rag_recommend

router = APIRouter(prefix="/rag", tags=["rag"])


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=64)
    kind: str = Field(default="passage", pattern="^(query|passage)$")


class EmbedResponse(BaseModel):
    dim: int
    vectors: list[list[float]]

class SearchRequest(BaseModel):
    region: str
    address: str
    business_code: str
    employee_count: int
    open_date: date
    birth_date: date | None = None
    annual_revenue: int | None = None


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """디버그·적재용 임베딩 엔드포인트. 모델 추론은 스레드풀로 뺀다."""
    if req.kind == "query":
        vectors = [await run_in_threadpool(koe5.embed_query, req.texts[0])]
    else:
        vectors = await run_in_threadpool(koe5.embed_passages, req.texts)
    return EmbedResponse(dim=koe5.EMBEDDING_DIM, vectors=vectors)

@router.post("/search")
async def search(req: SearchRequest):
    result = await rag_search.search(**req.model_dump())
    return {
        "query": result.query_text,
        "programs": [
            {
                "program_id": h.program_id,
                "pblanc_id": h.pblanc_id,
                "title": h.title,
                "distance": round(h.best_distance, 4),
                "chunks": h.chunks,
            }
            for h in result.hits
        ],
    }

@router.post("/recommend")
async def recommend(req: SearchRequest):
    return await rag_recommend.recommend(**req.model_dump())