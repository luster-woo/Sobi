import logging
from datetime import date

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.rag import explain as rag_explain
from app.rag import recommend as rag_recommend
from app.rag import search as rag_search
from app.rag.embedding import koe5

logger = logging.getLogger(__name__)

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


class ExplainRequest(SearchRequest):
    """추천 결과 한 건에 대한 설명 요청. 프로필은 추천 때와 같아야 한다.

    프로필이 다르면 청크가 달라지고, 판정이 본 것과 다른 대목으로 설명하게 된다.
    """
    program_id: int
    # 판정 결과를 **입력으로** 받는다. 여기서 다시 판정하지 않는다.
    # 생성 쪽에 판단을 맡기면 Jev 는 '가능'인데 설명은 '어려워 보입니다'가
    # 나오고, 사용자는 어느 쪽을 믿을지 알 수 없다.
    status: str = Field(pattern="^(eligible|ineligible|unknown)$")

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

    벡터 + 어휘 검색(BM25) + Jev 재정렬 필터. **기본값이 둘 다 켜져 있다.**

    그래서 후보마다 Jev 를 부르고 약 1초가 걸린다. docs/02_api_contract.md 의
    "LLM 을 부르지 않는다, 1초 미만" 계약이 깨진 상태다. 계약을 바꿀 만한
    개선이라고 보고 켰다 — 근거는 docs/06_search_quality.md.

    어휘와 재정렬은 한 쌍이다. 어휘가 후보를 넓히고 재정렬이 잡음을 버린다.
    하나만 끄면 안 켜느니만 못하다.
    """
    programs = await rag_search.search_by_text(
        query=req.query, top_k=req.top_k,
        hybrid=req.hybrid, rerank=req.rerank)
    return {"programs": programs}

@router.post("/recommend")
async def recommend(req: SearchRequest):
    return await rag_recommend.recommend(**req.model_dump())


@router.post("/explain")
async def explain(req: ExplainRequest):
    """추천 결과 한 건을 사장님께 설명한다. GMS 를 1회 부른다.

    **추천 목록에 붙이지 말고 사용자가 펼쳐볼 때 부를 것.** 건당 약 10크레딧,
    2~3초다. 목록 20건을 한꺼번에 생성하면 예산이 금방 마르고 화면도 멈춘다.

    **호출한 쪽이 캐시해야 한다.** 설명은 (사용자, 공고)당 한 번만 만들면
    되고 프로필이 바뀌지 않는 한 내용도 바뀌지 않는다. 저장해 두면 두 번째
    조회부터 크레딧 0, 지연 0이다.

    실패하면 explanation 이 null 이다. 예외로 올리지 않는다 — 설명은 부가
    정보이고, 이것 때문에 공고 상세 화면이 죽으면 안 된다. 호출한 쪽은
    추천 응답의 reason(템플릿 문장)을 그대로 쓰면 된다.

    설계와 측정은 docs/08_explain.md.
    """
    r = await rag_explain.explain(**req.model_dump())
    if r is None:
        return {"explanation": None}
    # 비용은 응답이 아니라 로그로 남긴다. 호출한 쪽이 쓸 값이 아니고,
    # 예산이 어디서 마르는지는 서버에서 보면 된다.
    logger.info("설명 생성: 공고 %d %s — %d토큰(입력 %d) %.1f크레딧",
                req.program_id, req.status, r.total_tokens,
                r.prompt_tokens, r.credits)
    return {"explanation": r.text}