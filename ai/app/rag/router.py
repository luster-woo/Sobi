from datetime import date

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.rag import recommend as rag_recommend
from app.rag import search as rag_search
from app.rag.embedding import koe5

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
    open_date: date | None = None      # 예비창업자는 개업일이 없다
    annual_revenue: int | None = None
    birth_date: date | None = None
    is_prestartup: bool = False

class SearchTextRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    top_k: int = Field(default=20, ge=1, le=100)
    # 어휘 검색(BM25) + Jev 재정렬. 둘은 한 쌍이라 같이 켠다.
    # 어휘가 후보를 넓히고 재정렬이 잡음을 버린다. 하나만 켜면 손해다.
    # 근거는 docs/06_search_quality.md.
    hybrid: bool = True
    rerank: bool = True

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
    """검색 단계만. 내부 디버깅·평가용."""
    # 검색은 연령을 쓰지 않는다. 판정에서만 쓴다.
    result = await rag_search.search(**req.model_dump(exclude={"birth_date"}))
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

@router.post("/search-text")
async def search_text(req: SearchTextRequest):
    """질의 문장으로 공고를 찾는다.

    기본 경로(hybrid)는 벡터 + 어휘 검색이고 LLM 을 부르지 않아 1초 미만이다.
    rerank=true 를 주면 후보마다 Jev 를 부르므로 1초를 넘는다. 측정상 이득이
    없어 기본은 꺼져 있다.
    """
    programs = await rag_search.search_by_text(
        query=req.query, top_k=req.top_k,
        hybrid=req.hybrid, rerank=req.rerank)
    return {"programs": programs}

@router.post("/recommend")
async def recommend(req: SearchRequest):
    return await rag_recommend.recommend(**req.model_dump())