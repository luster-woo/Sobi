"""정형 필터 + 벡터 검색. SQL 한 방으로 청크를 뽑고 공고 단위로 묶는다."""

import logging
from dataclasses import dataclass
from datetime import date

from app.core import db
from app.rag import profile
from app.rag.embedding import koe5

logger = logging.getLogger(__name__)

CHUNK_LIMIT = 30      # 벡터 정렬로 가져올 청크 수
PROGRAM_LIMIT = 10    # LLM 검증에 넘길 공고 수
CHUNKS_PER_PROGRAM = 3

# 정형 필터. 원칙: 공고 값이 NULL이면 통과. 확실한 탈락만 SQL이 담당한다.
SEARCH_SQL = """
SELECT c.support_program_id,
       c.chunk_index,
       c.content,
       c.embedding <=> %(vec)s::vector AS distance,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.type,
       sp.end_date,
       cond.llm_conditions
FROM program_chunk c
JOIN support_program sp ON sp.id = c.support_program_id
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
WHERE (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
  AND (
    cond.id IS NULL
    OR (
      -- 지역: 전국이거나 시도 일치
      (cond.nationwide OR cond.region_sido IS NULL OR cond.region_sido = %(region)s)
      -- 규모: 소공인 제외, 소상공인은 5인 미만
      AND (cond.target_scale IS NULL
           OR cond.target_scale = '무관'
           OR cond.target_scale = '중소기업'
           OR (cond.target_scale = '소상공인' AND %(employee_count)s < 5))
      -- 표준 융자제외업종: 공고와 유저가 둘 다 해당하면 탈락
      AND NOT (cond.std_exclusion AND %(std_excluded)s)
      -- 연매출 상한
      AND (cond.max_revenue IS NULL OR %(revenue)s IS NULL
           OR %(revenue)s <= cond.max_revenue)
      -- 업력
      AND (cond.min_biz_months IS NULL OR %(months)s >= cond.min_biz_months)
      AND (cond.max_biz_months IS NULL OR %(months)s <= cond.max_biz_months)
    )
  )
ORDER BY c.embedding <=> %(vec)s::vector
LIMIT %(limit)s
"""


@dataclass
class ProgramHit:
    program_id: int
    pblanc_id: str
    title: str
    type: str
    best_distance: float
    chunks: list[str]
    llm_conditions: dict | None


async def _lookup_industry(business_code: str) -> tuple[str, bool]:
    """업종 코드 → (이름, 표준제외업종 여부)."""
    async with db.acquire() as conn:
        cur = await conn.execute(
            "SELECT name, is_std_excluded FROM minor_code WHERE code = %s",
            (business_code,),
        )
        row = await cur.fetchone()
    if row is None:
        raise ValueError(f"알 수 없는 업종 코드: {business_code}")
    return row["name"], row["is_std_excluded"]


async def search(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None = None,
    limit: int = PROGRAM_LIMIT,
) -> tuple[str, list[ProgramHit]]:
    """(질의문, 공고 목록)을 돌려준다. 질의문은 디버깅·응답 확인용."""
    industry_name, std_excluded = await _lookup_industry(business_code)

    query_text = profile.to_query(
        region=region,
        address=address,
        business_name=industry_name,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
    )
    vector = koe5.embed_query(query_text)

    async with db.acquire() as conn:
        cur = await conn.execute(SEARCH_SQL, {
            "vec": vector,
            "region": region,
            "employee_count": employee_count,
            "std_excluded": std_excluded,
            "revenue": annual_revenue,
            "months": profile.biz_months(open_date),
            "limit": CHUNK_LIMIT,
        })
        rows = await cur.fetchall()

    # 청크를 공고 단위로 묶는다. rows는 이미 거리순이므로 등장 순서가 곧 순위다.
    hits: dict[int, ProgramHit] = {}
    for row in rows:
        pid = row["support_program_id"]
        hit = hits.get(pid)
        if hit is None:
            if len(hits) >= limit:
                continue
            hits[pid] = ProgramHit(
                program_id=pid,
                pblanc_id=row["pblanc_id"],
                title=row["pblanc_nm"],
                type=row["type"],
                best_distance=row["distance"],
                chunks=[row["content"]],
                llm_conditions=row["llm_conditions"],
            )
        elif len(hit.chunks) < CHUNKS_PER_PROGRAM:
            hit.chunks.append(row["content"])

    logger.info("검색: %d청크 → %d공고", len(rows), len(hits))
    return query_text, list(hits.values())