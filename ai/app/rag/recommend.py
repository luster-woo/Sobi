"""검색 결과를 LLM으로 검증한다.

판정 범위는 사업자 프로필로 대조할 수 있는 조건으로 한정한다.
조건의 mode/direction으로 처리 방식이 갈린다.
설계 근거는 docs/04_judgement_design.md.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import date

from app.core import gms
from app.rag import profile, search

logger = logging.getLogger(__name__)

BATCH_SIZE = 10  # 한 번에 판정할 공고 수. 응답 잘림을 막는다

# 기업마당 제목 규칙: "[경북] 구미시 2026년 ..." — 태그 뒤 첫 토큰이 시군구다.
TITLE_SIGUNGU = re.compile(r"^\s*\[[^\]]+\]\s*([가-힣]+[시군구])\s")

SYSTEM_PROMPT = """\
너는 소상공인 정부지원사업 자격 심사관이다.
사업자 정보와 공고별 조건을 대조해 신청 자격을 판정한다.

## 판정 범위
사업자 정보로 대조할 수 있는 조건만 판정한다.
대조 가능한 정보: 주소(시도·시군구·읍면동), 업종, 표준 융자제외업종 해당 여부,
대표자 연령, 개업일(업력·예비창업자 여부), 상시근로자 수, 연매출

## 조건 읽는 법
각 조건에는 mode와 direction이 붙어 있다.

mode
  "우대" — 판정에 쓰지 않는다. benefits에 넣는다
  "필수" — 아래 direction에 따라 처리한다

direction
  "요건" — 해당해야만 통과하는 조건
    대조 가능하고 충족 → 통과
    대조 가능하고 미충족 → ineligible
    대조 불가 → unknown
  "결격" — 해당하면 탈락하는 조건
    대조 가능하고 해당 → ineligible
    대조 가능하고 해당 없음 → 통과
    대조 불가 → 해당하지 않는 것으로 보고 check_items에 적는다

## status
  ineligible — 위 규칙으로 탈락이 하나라도 확인됨
  unknown    — 탈락은 없으나 대조 불가한 "요건"이 있음
  eligible   — 그 외

확인 불가를 이유로 ineligible을 주지 마라.
제공되지 않은 정보를 "없다" 또는 "있다"로 단정하지 마라.
공고에 없는 조건을 지어내지 마라. 근거는 제공된 조건 목록에서만 찾는다.

## 제목에 표기된 지역
기업마당이 제목 앞에 붙인 표기다. 참고 정보이며 조건 목록보다 우선하지 않는다.
  - 조건 목록에 지역 조건이 있으면 그것을 따른다
  - 조건 목록에 지역 조건이 없을 때만, 지자체 공고는 그 지역 사업자
    한정일 가능성이 높다고 보고 판단에 참고한다
  - 사업명에 들어간 지명이 지원 시설·센터의 위치일 수 있다는 점도 함께 고려한다

## 업종 코드 체계
사업자 업종은 CS 코드(소상공인 상권정보 분류)이고, 공고는 KSIC(한국표준산업분류)
코드를 쓰는 경우가 많다. 두 체계는 번호가 다르므로 코드 숫자를 직접 비교하지 마라.
업종 이름으로 대조한다.
  예) 사업자 "부동산중개업" ↔ 공고 "부동산 중개·대리업(68221)" → 같은 업종
  예) 사업자 "제과점" ↔ 공고 "식품제조업(KSIC C10)" → 제과점은 소매·음식점이므로 다름

## 출력
아래 JSON 형식으로만 답한다. 설명을 덧붙이지 않는다.
{"results": [{"program_id": 1, "status": "eligible",
  "reason": "한 문장", "check_items": ["..."], "benefits": ["..."]}]}

reason은 판정 근거를 한 문장으로. ineligible이면 무엇이 어긋났는지 밝힌다.
reason은 "~습니다" 체로 끝맺는다. SQL 탈락 사유와 문체를 맞추기 위함이다.
check_items는 신청 전 사업자가 직접 확인해야 할 항목이다.
benefits는 우대 조건을 그대로 옮긴다. 없으면 빈 배열.
"""


def _sigungu(title: str) -> str | None:
    m = TITLE_SIGUNGU.match(title)
    return m.group(1) if m else None


def _build_user_prompt(
    *,
    address: str,
    industry_name: str,
    std_excluded: bool,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None,
    birth_date: date | None,
    hits: list[search.ProgramHit],
) -> str:
    months = profile.biz_months(open_date)
    lines = [
        "# 사업자 정보",
        f"- 주소: {address}",
        f"- 업종: {industry_name}"
        + (" (표준 융자제외업종에 해당)" if std_excluded else " (표준 융자제외업종 아님)"),
        f"- 상시근로자: {employee_count}명",
        f"- 개업일: {open_date} (업력 {months}개월, 이미 사업자등록을 마쳤으므로 예비창업자가 아님)",
    ]
    if annual_revenue:
        lines.append(f"- 연매출: {annual_revenue / 100_000_000:.1f}억원")
    if birth_date:
        lines.append(f"- 대표자: 만 {profile.age(birth_date)}세 ({birth_date})")
    else:
        lines.append("- 대표자 연령: 정보 없음")

    lines.append("\n# 판정할 공고")
    for hit in hits:
        lines.append(f"\n## program_id: {hit.program_id}")
        lines.append(hit.title)

        sigungu = _sigungu(hit.title)
        if sigungu:
            lines.append(f"- (참고) 제목에 표기된 지역: {sigungu}")

        conditions = (hit.llm_conditions or {}).get("conditions", [])
        if not conditions:
            lines.append("- (추출된 조건 없음)")
            continue
        for c in conditions:
            mode = c.get("mode", "필수")
            direction = c.get("direction", "결격")
            category = c.get("category", "other")
            lines.append(f"- [{mode}/{direction}/{category}] {c.get('text', '')}")
    return "\n".join(lines)


async def _judge(hits: list[search.ProgramHit], *, model: str,
                 **profile_args) -> tuple[dict[int, dict], int]:
    """공고 묶음 하나를 판정한다. (program_id → 판정, 토큰)."""
    user_prompt = _build_user_prompt(hits=hits, **profile_args)
    completion = await gms.get_client().chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        temperature=0,
        max_completion_tokens=4000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    tokens = completion.usage.total_tokens if completion.usage else 0
    if completion.choices[0].finish_reason == "length":
        logger.warning("응답 잘림 — 공고 %d건 중 일부가 누락됐을 수 있음", len(hits))

    raw = completion.choices[0].message.content
    try:
        parsed = {v["program_id"]: v for v in json.loads(raw).get("results", [])}
    except (json.JSONDecodeError, KeyError, TypeError):
        logger.exception("LLM 응답 파싱 실패: %s", raw[:500])
        parsed = {}

    missing = {h.program_id for h in hits} - parsed.keys()
    if missing:
        logger.warning("판정 누락 %d건: %s", len(missing), sorted(missing))
    return parsed, tokens


async def recommend(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None = None,
    birth_date: date | None = None,
    model: str = gms.DEFAULT_MODEL,
    include_rejected: bool = True,
) -> dict:
    result = await search.search(
        region=region,
        address=address,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        with_rejected=include_rejected,
    )

    verdicts: dict[int, dict] = {}
    tokens = 0

    if result.hits:
        profile_args = {
            "address": address,
            "industry_name": result.industry_name,
            "std_excluded": result.std_excluded,
            "employee_count": employee_count,
            "open_date": open_date,
            "annual_revenue": annual_revenue,
            "birth_date": birth_date,
        }
        batches = [result.hits[i:i + BATCH_SIZE]
                   for i in range(0, len(result.hits), BATCH_SIZE)]
        outcomes = await asyncio.gather(
            *(_judge(b, model=model, **profile_args) for b in batches)
        )
        for parsed, used in outcomes:
            verdicts |= parsed
            tokens += used

    results = []
    for hit in result.hits:
        v = verdicts.get(hit.program_id, {})
        results.append({
            "program_id": hit.program_id,
            "pblanc_id": hit.pblanc_id,
            "title": hit.title,
            "distance": round(hit.best_distance, 4),
            "status": v.get("status", "unknown"),
            "reason": v.get("reason", "LLM 판정 실패"),
            "check_items": v.get("check_items", []),
            "benefits": v.get("benefits", []),
            "judged_by": "llm",
        })

    # SQL에서 걸러진 공고. 사유가 결정론적이라 LLM을 부르지 않는다.
    for rej in result.rejected:
        results.append({
            "program_id": rej.program_id,
            "pblanc_id": rej.pblanc_id,
            "title": rej.title,
            "distance": None,
            "status": "ineligible",
            "reason": rej.reason,
            "check_items": [],
            "benefits": [],
            "judged_by": "sql",
        })

    order = {"eligible": 0, "unknown": 1, "ineligible": 2}
    results.sort(key=lambda r: (order.get(r["status"], 3),
                                r["distance"] if r["distance"] is not None else 99))

    logger.info("판정: 후보 %d / 탈락 %d / 토큰 %d",
                len(result.hits), len(result.rejected), tokens)
    return {"query": result.query_text, "results": results}