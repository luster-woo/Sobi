"""검색 결과 재정렬. 벡터 거리로 고른 뒤 Jev 가 다시 순서를 매긴다.

**무엇을 고치려는 것인가.** 임베딩은 표면 단어에 붙는다. 측정된 예:

    "장사가 안돼서 가게를 정리하려고 합니다"
      1위 골목형상점가 지정          ← "가게"·"상점"에 붙었다
      2위 전통시장 시설현대화
      3위 재기지원(폐업정리)          ← 이것이 정답

    "폐업하려는데 지원받을 수 있나요"
      1·2·4위가 전부 정답

같은 의도인데 표현만 바꾸면 무너진다. 근거는 docs/06_search_quality.md.

거리는 질의와 문서를 **따로** 벡터로 만든 뒤 비교한 값이라, 둘을 같이 읽고
판단하지 못한다. 재정렬은 질의와 공고를 한 state 에 넣어 "이것이 답이 되는가"
를 직접 묻는다.

**BM25 가 아니라 재정렬인 이유.** BM25 는 단어가 겹쳐야 점수를 준다. 위
질의는 정답과 겹치는 단어가 하나도 없고, 오히려 지금 1·2위인 "상점가" 공고를
더 끌어올린다. 표면 단어 문제를 키우는 쪽이다. BM25 가 듣는 것은 고유명사
질의("희망리턴패키지", "소담스퀘어")인데 그쪽은 아직 측정하지 않았다.

비용은 후보당 1콜이다. 30건이면 약 1초 늘어난다. 그래서 기본값은 꺼짐이고,
호출자가 켠다.
"""

import asyncio
import logging

from typesafe_sdk import Score

from app.rag import jev

logger = logging.getLogger(__name__)

# 0 에서 3 까지. 순서가 있는 등급이라 Score 가 기대값을 돌려준다.
# 2 와 3 을 나눈 이유: "분야가 같다"와 "묻는 것에 해당한다"가 다르다.
# 폐업 질의에 상권 공고가 올라오던 것이 정확히 1~2 에 해당한다.
QUESTION = {
    "relevance": Score(
        instructions="사장님이 이렇게 검색했다. 이 공고가 그 질문에 대한 답이 되는가?",
        criteria=[
            "전혀 관련이 없다",
            "분야는 겹치지만 사장님이 찾는 것과 다르다",
            "관련은 있으나 핵심 답은 아니다",
            "사장님이 찾는 바로 그 지원이다",
        ],
    )
}


def _state(query: str, title: str, chunks: list[str]) -> str:
    body = "\n".join(chunks)
    return f"[사장님 검색어]\n{query}\n\n[공고]\n{title}\n\n[공고 내용]\n{body}"


def _ask(query: str, title: str, chunks: list[str]) -> tuple[float, float]:
    r = jev.get_client().system_one(
        state=_state(query, title, chunks), questions=QUESTION, model=jev.MODEL)
    a = r.scores["relevance"]
    return a.score, a.confidence


async def rerank(query: str, docs: dict[int, tuple[str, list[str]]]
                 ) -> dict[int, tuple[float, float]]:
    """program_id → (점수 0~3, 확신도). 실패한 건은 빠진다.

    호출자는 빠진 건을 원래 순서로 두면 된다. 재정렬은 개선이지 필수가 아니다.
    """
    sem = asyncio.Semaphore(jev.CONCURRENCY)

    async def one(pid: int, title: str, chunks: list[str]):
        async with sem:
            try:
                return pid, await asyncio.to_thread(_ask, query, title, chunks)
            except Exception:
                logger.exception("재정렬 실패 program_id=%s", pid)
                return pid, None

    pairs = await asyncio.gather(*(one(p, t, c) for p, (t, c) in docs.items()))
    return {p: v for p, v in pairs if v is not None}
