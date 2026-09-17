"""정형 필터 + 벡터 검색.

SQL 필터를 통과한 공고 전체를 후보로 돌려준다. 벡터 유사도는 순서를 정하는
데만 쓴다. 탈락 공고는 사유와 함께 따로 돌려준다(LLM을 부르지 않는다).
설계 근거는 docs/04_judgement_design.md.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date

from app.core import db
from app.rag import profile
from app.rag.embedding import koe5

logger = logging.getLogger(__name__)

CHUNKS_PER_PROGRAM = 2  # 디버그용. 판정에는 llm_conditions만 쓴다

# 정형 필터. 원칙: 공고 값이 NULL이면 통과. 확실한 탈락만 SQL이 담당한다.
FILTER_SQL = """
    (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
    AND (
      cond.id IS NULL
      OR (
        (cond.nationwide OR cond.region_sido IS NULL OR cond.region_sido = %(region)s)
        AND (cond.target_scale IS NULL
             OR cond.target_scale = '무관'
             OR cond.target_scale = '중소기업'
             OR (cond.target_scale = '소상공인' AND %(employee_count)s < 5))
        AND (cond.max_revenue IS NULL OR %(revenue)s IS NULL
             OR %(revenue)s <= cond.max_revenue)
        AND (cond.min_biz_months IS NULL OR %(months)s >= cond.min_biz_months)
        AND (cond.max_biz_months IS NULL OR %(months)s <= cond.max_biz_months)
      )
    )
"""

# 공고별 상위 청크만 남긴다. 상위 N청크가 소수 공고에 몰리는 것을 막는다.
PASSED_SQL = f"""
WITH ranked AS (
    SELECT c.support_program_id,
           c.content,
           c.embedding <=> %(vec)s::vector AS distance,
           ROW_NUMBER() OVER (
               PARTITION BY c.support_program_id
               ORDER BY c.embedding <=> %(vec)s::vector
           ) AS rn
    FROM program_chunk c
)
SELECT sp.id AS program_id,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.type,
       cond.llm_conditions,
       MIN(r.distance) AS best_distance,
       array_agg(r.content ORDER BY r.rn) AS chunks
FROM support_program sp
JOIN ranked r ON r.support_program_id = sp.id AND r.rn <= {CHUNKS_PER_PROGRAM}
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
WHERE {FILTER_SQL}
GROUP BY sp.id, sp.pblanc_id, sp.pblanc_nm, sp.type, cond.llm_conditions
ORDER BY best_distance
"""

# 탈락 공고. 사유를 만들 수 있게 조건 값을 그대로 가져온다.
REJECTED_SQL = f"""
SELECT sp.id AS program_id,
       sp.pblanc_id,
       sp.pblanc_nm,
       sp.end_date,
       cond.nationwide,
       cond.region_sido,
       cond.target_scale,
       cond.max_revenue,
       cond.min_biz_months,
       cond.max_biz_months
FROM support_program sp
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
WHERE NOT ({FILTER_SQL})
ORDER BY sp.pblanc_nm
"""

# 질의 문장으로만 찾는다. 사업자 정보도 정형 필터도 쓰지 않는다.
# 자격 판정은 마이데이터 연동 때 이미 계산해 저장했으므로 여기서는 고르기만 한다.
TEXT_SEARCH_SQL = """
WITH ranked AS (
    SELECT c.support_program_id,
           MIN(c.embedding <=> %(vec)s::vector) AS distance
    FROM program_chunk c
    GROUP BY c.support_program_id
)
SELECT support_program_id AS program_id,
       distance
FROM ranked
ORDER BY distance
LIMIT %(top_k)s
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


@dataclass
class RejectedProgram:
    program_id: int
    pblanc_id: str
    title: str
    reason: str


@dataclass
class SearchResult:
    query_text: str
    industry_name: str
    std_excluded: bool
    hits: list[ProgramHit]
    rejected: list[RejectedProgram] = field(default_factory=list)


async def lookup_industry(business_code: str) -> tuple[str, bool]:
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


def _reject_reason(row: dict, *, region: str, employee_count: int,
                   months: int, revenue: int | None) -> str:
    """SQL 탈락 사유를 문장으로. LLM을 부르지 않는다."""
    if row["end_date"] and row["end_date"] < date.today():
        return f"접수가 마감되었습니다 ({row['end_date']})"
    if not row["nationwide"] and row["region_sido"] and row["region_sido"] != region:
        return f"{row['region_sido']} 소재 사업자만 신청할 수 있습니다 (현재 {region})"
    scale = row["target_scale"]
    if scale == "소공인":
        return "제조업 기반 소공인만 신청할 수 있습니다"
    if scale == "소상공인" and employee_count >= 5:
        return f"상시근로자 5인 미만이어야 합니다 (현재 {employee_count}명)"
    if row["max_revenue"] and revenue and revenue > row["max_revenue"]:
        return (f"연매출 {row['max_revenue'] / 100_000_000:.1f}억원 이하여야 합니다 "
                f"(현재 {revenue / 100_000_000:.1f}억원)")
    if row["min_biz_months"] and months < row["min_biz_months"]:
        return (f"업력 {row['min_biz_months']}개월 이상이어야 합니다 "
                f"(현재 {months}개월)")
    if row["max_biz_months"] and months > row["max_biz_months"]:
        return (f"업력 {row['max_biz_months']}개월 이하여야 합니다 "
                f"(현재 {months}개월)")
    return "신청 자격에 해당하지 않습니다"


async def search(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None = None,
    with_rejected: bool = False,
) -> SearchResult:
    """검색 질의문·업종명·후보 공고를 돌려준다.

    with_rejected=True 면 SQL에서 탈락한 공고도 사유와 함께 담는다.
    """
    industry_name, std_excluded = await lookup_industry(business_code)

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
    months = profile.biz_months(open_date)
    params = {
        "vec": vector,
        "region": region,
        "employee_count": employee_count,
        "revenue": annual_revenue,
        "months": months,
    }

    async with db.acquire() as conn:
        cur = await conn.execute(PASSED_SQL, params)
        rows = await cur.fetchall()

        rejected: list[RejectedProgram] = []
        if with_rejected:
            cur = await conn.execute(REJECTED_SQL, {k: v for k, v in params.items()
                                                    if k != "vec"})
            for r in await cur.fetchall():
                rejected.append(RejectedProgram(
                    program_id=r["program_id"],
                    pblanc_id=r["pblanc_id"],
                    title=r["pblanc_nm"],
                    reason=_reject_reason(r, region=region,
                                          employee_count=employee_count,
                                          months=months, revenue=annual_revenue),
                ))

    hits = [
        ProgramHit(
            program_id=row["program_id"],
            pblanc_id=row["pblanc_id"],
            title=row["pblanc_nm"],
            type=row["type"],
            best_distance=row["best_distance"],
            chunks=row["chunks"],
            llm_conditions=row["llm_conditions"],
        )
        for row in rows
    ]

    logger.info("검색: 후보 %d공고 / 탈락 %d공고", len(hits), len(rejected))
    return SearchResult(
        query_text=query_text,
        industry_name=industry_name,
        std_excluded=std_excluded,
        hits=hits,
        rejected=rejected,
    )

async def search_by_text(*, query: str, top_k: int = 20) -> list[dict]:
    """질의 문장으로 공고를 찾는다. LLM을 부르지 않는다.

    /rag/recommend 와 성격이 다르다. 저 쪽은 사업자 프로필로 전량을 판정하고
    여기는 "질의 ↔ 공고" 유사도만 본다. 판정을 붙이는 것은 백엔드의 몫이다.
    설계 근거는 docs/02_api_contract.md.
    """
    # 임베딩은 CPU 를 오래 잡는다. 이벤트 루프를 막지 않도록 스레드로 뺀다.
    vector = await asyncio.to_thread(koe5.embed_query, query)

    async with db.acquire() as conn:
        cur = await conn.execute(TEXT_SEARCH_SQL, {"vec": vector, "top_k": top_k})
        rows = await cur.fetchall()

    logger.info("텍스트 검색: %r → %d공고", query, len(rows))

    return [
        {"program_id": row["program_id"], "distance": round(row["distance"], 4)}
        for row in rows
    ]