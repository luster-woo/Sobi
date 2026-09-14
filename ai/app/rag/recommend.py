"""검색 결과를 LLM으로 검증한다. 공고 여러 건을 한 번의 호출로 판정."""

import json
import logging
from datetime import date

from app.core import gms
from app.rag import profile, search

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
너는 소상공인 정부지원사업 자격 심사관이다.
주어진 사업자 정보로 각 공고의 신청 자격을 판정한다.

판정 규칙:
1. "eligible" — 공고의 필수 조건을 모두 충족한다고 확인됨
2. "ineligible" — 필수 조건 중 하나라도 명확히 어긋남
3. "unknown" — 사업자 정보만으로는 확인할 수 없는 필수 조건이 있음
   (대표자 연령·성별, 신용점수, 대출·보험 가입 여부, 매출 감소율,
    휴폐업·체납 여부, 중복 수혜 이력 등)

주의:
- 시군구·읍면동 조건은 사업자 주소와 대조한다. 시도만 같고 시군구가 다르면 ineligible.
- 공고에 없는 조건을 지어내지 마라. 근거는 반드시 제공된 본문에서 찾는다.
- 우대 조건은 충족하지 않아도 eligible이다. 필수 조건만 판정에 쓴다.
- check_items에는 신청 전 사업자가 직접 확인해야 할 항목을 적는다.

반드시 아래 JSON 형식으로만 답한다:
{"results": [{"program_id": 1, "status": "eligible", "reason": "한 문장", "check_items": ["..."]}]}
"""


def _build_user_prompt(
    *,
    address: str,
    industry_name: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None,
    hits: list[search.ProgramHit],
) -> str:
    months = profile.biz_months(open_date)
    revenue = f"{annual_revenue / 100_000_000:.1f}억원" if annual_revenue else "정보 없음"

    lines = [
        "# 사업자 정보",
        f"- 주소: {address}",
        f"- 업종: {industry_name}",
        f"- 상시근로자: {employee_count}명",
        f"- 개업일: {open_date} (업력 {months}개월)",
        f"- 연매출: {revenue}",
        "",
        "# 판정할 공고",
    ]
    for hit in hits:
        lines.append(f"\n## program_id: {hit.program_id}")
        lines.append(f"제목: {hit.title}")
        conditions = (hit.llm_conditions or {}).get("conditions", [])
        if conditions:
            lines.append("추출된 조건:")
            for c in conditions:
                lines.append(f"- [{c.get('mode', '필수')}] {c.get('text', '')}")
        lines.append("본문:")
        for chunk in hit.chunks:
            lines.append(chunk)
    return "\n".join(lines)


async def recommend(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None = None,
) -> dict:
    result = await search.search(
        region=region,
        address=address,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
    )

    if not result.hits:
        return {"query": result.query_text, "results": []}

    user_prompt = _build_user_prompt(
        address=address,
        industry_name=result.industry_name,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        hits=result.hits,
    )

    completion = await gms.get_client().chat.completions.create(
        model=gms.DEFAULT_MODEL,
        response_format={"type": "json_object"},
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = completion.choices[0].message.content
    try:
        verdicts = {v["program_id"]: v for v in json.loads(raw).get("results", [])}
    except (json.JSONDecodeError, KeyError, TypeError):
        logger.exception("LLM 응답 파싱 실패: %s", raw[:500])
        verdicts = {}

    results = []
    for hit in result.hits:
        v = verdicts.get(hit.program_id, {})
        results.append({
            "program_id": hit.program_id,
            "pblanc_id": hit.pblanc_id,
            "title": hit.title,
            "distance": round(hit.best_distance, 4),
            # 판정이 없으면 탈락시키지 않고 unknown으로 둔다.
            "status": v.get("status", "unknown"),
            "reason": v.get("reason", "LLM 판정 실패"),
            "check_items": v.get("check_items", []),
        })

    logger.info("검증: %d공고, 토큰 %s", len(results), completion.usage.total_tokens)
    return {"query": result.query_text, "results": results}