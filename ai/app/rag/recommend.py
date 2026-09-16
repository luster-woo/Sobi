"""검색 결과를 LLM으로 검증한다.

판정 범위는 사업자 프로필로 대조할 수 있는 조건으로 한정한다.
설계 근거는 docs/04_judgement_design.md.
"""

from __future__ import annotations

import json
import re
import logging
from datetime import date

from app.core import gms
from app.rag import profile, search

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
너는 소상공인 정부지원사업 자격 심사관이다.
사업자 정보와 공고별 조건을 대조해 신청 자격을 판정한다.

## 판정 범위
사업자 정보로 대조할 수 있는 조건만 판정한다.

판정에 사용
  region   시도·시군구·읍면동 → 사업자 주소와 대조
  industry 업종·표준 융자제외업종 → 사업자 업종과 대조
  owner    대표자 연령, 예비창업자 여부 → 생년월일·개업일과 대조
  track    1인 사업장 등 규모 → 상시근로자 수와 대조

판정하지 않음 — 전부 check_items로 옮긴다
  self_report  체납, 휴·폐업, 중복 수혜, 위반건축물 등 본인 신고 사항
  other        그 밖의 조건

## 제목에 표기된 지역
기업마당이 제목 앞에 붙인 표기다. 참고 정보이며 조건 목록보다 우선하지 않는다.
  - 조건 목록에 지역 조건이 있으면 그것을 따른다
  - 조건 목록에 지역 조건이 없을 때만, 지자체 공고는 그 지역 사업자
    한정일 가능성이 높다고 보고 판단에 참고한다
  - 사업명에 들어간 지명이 지원 시설·센터의 위치일 수 있다는 점도 함께 고려한다

## mode 해석
  필수 — 충족하지 않으면 ineligible
  제외 — 해당하면 ineligible. 해당 여부를 확인할 수 없으면
         해당하지 않는 것으로 보고 check_items에 적는다
  우대 — 판정에 쓰지 않는다. benefits에 넣는다

## status
  "ineligible" — 판정 범위 안의 조건이 명확히 어긋남이 확인됨
  "unknown"    — 확인할 수 없는 필수 조건이 "해당해야만 통과"하는 종류일 때만.
                 성별(여성기업), 신용점수, 특정 지위(새출발기금 약정,
                 백년소상공인), 보험·대출 가입, 매출 감소율이 여기 해당한다
  "eligible"   — 그 외. 확인 불가 조건이 결격사유형(체납·휴폐업·중복수혜)
                 뿐이면 eligible이다

## 정보가 없는 항목
제공되지 않은 정보를 "없다" 또는 "있다"로 단정하지 마라.
사업자 정보에 나오지 않는 항목은 모르는 것이다.
  틀림: "대표자에게 만 2세 미만 자녀가 없으므로 부적합"
  틀림: "육아휴직 대상자 조건 충족 가능"
  옳음: status를 unknown으로 두고 reason에 "만 2세 미만 자녀 보유 여부를
        확인할 수 없음"이라고 적는다

적극요건형(해당해야만 통과하는 조건)을 확인할 수 없으면 반드시 unknown이다.
자녀 유무, 특정 지위(새출발기금 약정, 백년소상공인), 보험·대출 가입,
신용점수, 성별이 여기 해당한다.

확인 불가를 이유로 ineligible을 주지 마라.
공고에 없는 조건을 지어내지 마라. 근거는 제공된 조건 목록에서만 찾는다.

## 출력
아래 JSON 형식으로만 답한다. 설명을 덧붙이지 않는다.
{"results": [{"program_id": 1, "status": "eligible",
  "reason": "한 문장", "check_items": ["..."], "benefits": ["..."]}]}

reason은 판정 근거를 한 문장으로. ineligible이면 무엇이 어긋났는지 밝힌다.
check_items는 신청 전 사업자가 직접 확인해야 할 항목이다.
benefits는 우대 조건을 그대로 옮긴다. 없으면 빈 배열.
"""

JUDGED = ("region", "industry", "owner", "track")

# 기업마당 제목 규칙: "[경북] 구미시 2026년 ..." — 태그 뒤 첫 토큰이 시군구다.
TITLE_SIGUNGU = re.compile(r"^\s*\[[^\]]+\]\s*([가-힣]+[시군구])\s")


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

        sigungu = _sigungu(hit.title)          # ← 여기
        if sigungu:
            lines.append(f"- (참고) 제목에 표기된 지역: {sigungu}")

        conditions = (hit.llm_conditions or {}).get("conditions", [])
        if not conditions:
            lines.append("- (추출된 조건 없음)")
            continue
        for c in conditions:
            mode = c.get("mode", "필수")
            category = c.get("category", "other")
            lines.append(f"- [{mode}/{category}] {c.get('text', '')}")
    return "\n".join(lines)


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
        std_excluded=result.std_excluded,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        birth_date=birth_date,
        hits=result.hits,
    )

    completion = await gms.get_client().chat.completions.create(
        model=model,
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
            "status": v.get("status", "unknown"),
            "reason": v.get("reason", "LLM 판정 실패"),
            "check_items": v.get("check_items", []),
            "benefits": v.get("benefits", []),
        })

    logger.info("검증: %d공고, 토큰 %s", len(results), completion.usage.total_tokens)
    return {"query": result.query_text, "results": results}