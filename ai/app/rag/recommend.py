"""자격 판정. 검색 결과에 Jev 판정을 붙인다.

판정 규칙은 프롬프트가 아니라 app/rag/jev.py 의 게이트에 있다.
근거와 측정치는 docs/07_jev_judgement.md.
"""

from __future__ import annotations

import logging
import re
from datetime import date

from app.rag import jev, llm_judge, profile, search

logger = logging.getLogger(__name__)

# 기업마당 제목 규칙: "[경북] 구미시 2026년 ..." — 태그 뒤 첫 토큰이 시군구다.
TITLE_SIGUNGU = re.compile(r"^\s*\[[^\]]+\]\s*([가-힣]+[시군구])\s")

# 확인 불가 신호 → 사용자에게 보여줄 안내 문구
CHECK_HINT = {
    "needs_status": "특정 지위·자격(지정, 보험 가입, 신용점수, 상권 소속 등) 보유 여부를 확인하세요.",
    "needs_person": "대표자 개인 요건(자녀, 출산, 성별 등) 해당 여부를 확인하세요.",
}


def _sigungu(title: str) -> str | None:
    m = TITLE_SIGUNGU.match(title)
    return m.group(1) if m else None


def format_profile(
    *,
    address: str,
    industry_name: str,
    std_excluded: bool,
    employee_count: int,
    open_date: date | None,
    annual_revenue: int | None,
    birth_date: date | None,
    is_prestartup: bool,
) -> str:
    """사업자 정보. 지시문은 넣지 않는다. 사실만 쓴다."""
    lines = [
        f"- 주소: {address}" + (" (주민등록상 거주지)" if is_prestartup else ""),
        f"- 업종: {industry_name}" + (" (창업 희망 업종)" if is_prestartup else ""),
        f"- 표준 융자제외업종: {'해당' if std_excluded else '미해당'}",
    ]
    lines.append(f"- 대표자 연령: 만 {profile.age(birth_date)}세" if birth_date
                 else "- 대표자 연령: 정보 없음")

    if is_prestartup:
        # 결측이 '모름'이 아니라 '없음'이다. 섞이면 전부 unknown 이 된다.
        lines += [
            "- 사업자등록: 없음 (예비창업자)",
            "- 개업일·업력·연매출·상시근로자: 존재하지 않는 값이다.",
            "  확인하지 못한 값이 아니라 아직 사업을 시작하지 않아 없는 값이다.",
        ]
    else:
        lines += [
            "- 사업자등록: 있음",
            f"- 개업일: {open_date} (업력 {profile.biz_months(open_date)}개월)",
            f"- 상시근로자: {employee_count}명",
        ]
        if annual_revenue:
            lines.append(f"- 연매출: {annual_revenue / 100_000_000:.1f}억원")
    return "\n".join(lines)


def build_state(hit: search.ProgramHit, profile_block: str, *,
                with_doc: bool = True) -> str:
    """공고 하나에 대한 state. 조건과 원문을 함께 넣는다(A/C 비교 결과).

    with_doc=False 는 GMS 폴백용이다. 원문을 넣으면 공고당 4천 토큰이라
    배치가 터진다. 조건만 넣는 형태가 개선 전 배포 버전과 같은 입력이다.
    """
    parts = [f"[사업자]\n{profile_block}", f"[공고]\n{hit.title}"]

    sigungu = _sigungu(hit.title)
    if sigungu:
        parts.append(f"제목에 표기된 지역: {sigungu}")

    conditions = (hit.llm_conditions or {}).get("conditions", [])
    if conditions:
        rows = "\n".join(
            f"- [{c.get('mode', '필수')}/{c.get('direction', '결격')}] {c.get('text', '')}"
            for c in conditions)
        parts.append(f"[공고 조건]\n{rows}")

    if with_doc and hit.chunks:
        parts.append("[공고 원문]\n" + "\n".join(hit.chunks))
    return "\n\n".join(parts)


def _reason(status: str, sig: dict, hit: search.ProgramHit) -> tuple[str, list[str]]:
    """사유 문장과 확인 항목. Jev 는 문장을 만들지 않으므로 템플릿으로 조립한다.

    조건 텍스트에 고정되므로 공고에 없는 사유가 나올 수 없다.
    """
    checks: list[str] = []
    for key, hint in CHECK_HINT.items():
        if sig.get(key, 0) > jev.FACT:
            checks.append(hint)

    if sig.get("failed"):
        return "판정에 실패했습니다. 공고문을 직접 확인해 주세요.", checks

    if status == "unknown":
        if checks:
            return "공고가 요구하는 조건 중 사업자 정보로 확인할 수 없는 항목이 있습니다.", checks
        return "자격 충족 여부가 뚜렷하지 않아 공고문 확인이 필요합니다.", checks

    if status == "ineligible":
        return "공고의 필수 요건 중 충족하지 못하는 항목이 있습니다.", checks

    msg = "공고의 필수 요건을 충족합니다."
    if sig.get("either", 0) > jev.FACT:
        msg = "지원대상이 여러 유형 중 택일 구조이며, 그중 하나를 충족합니다."
    return msg, checks


def _benefits(hit: search.ProgramHit) -> list[str]:
    """우대 조건은 판정에 쓰지 않고 그대로 옮긴다."""
    return [c.get("text", "")
            for c in (hit.llm_conditions or {}).get("conditions", [])
            if c.get("mode") == "우대"]


async def recommend(
    *,
    region: str,
    address: str,
    business_code: str,
    employee_count: int,
    open_date: date | None = None,
    annual_revenue: int | None = None,
    birth_date: date | None = None,
    is_prestartup: bool = False,
    include_rejected: bool = True,
) -> dict:
    result = await search.search(
        region=region,
        address=address,
        business_code=business_code,
        employee_count=employee_count,
        open_date=open_date,
        annual_revenue=annual_revenue,
        is_prestartup=is_prestartup,
        with_rejected=include_rejected,
    )

    verdicts: dict[int, dict] = {}
    judged_by = "jev"
    if result.hits:
        block = format_profile(
            address=address,
            industry_name=result.industry_name,
            std_excluded=result.std_excluded,
            employee_count=employee_count,
            open_date=open_date,
            annual_revenue=annual_revenue,
            birth_date=birth_date,
            is_prestartup=is_prestartup,
        )
        states = {h.program_id: build_state(h, block) for h in result.hits}
        try:
            verdicts = await jev.judge(states, prestartup=is_prestartup)
        except jev.JevUnavailable:
            logger.warning("Jev 장애 — GMS 폴백으로 전환 (공고 %d건)", len(states))
            # 폴백은 원문 없이 조건만 넣는다. 배치에 원문을 실으면 터진다.
            lean = {h.program_id: build_state(h, block, with_doc=False)
                    for h in result.hits}
            verdicts = await llm_judge.judge(lean, prestartup=is_prestartup)
            judged_by = "llm"

    results = []
    for hit in result.hits:
        sig = verdicts.get(hit.program_id, {"status": "unknown", "failed": True})
        status = sig.get("status", "unknown")
        reason, checks = _reason(status, sig, hit)
        results.append({
            "program_id": hit.program_id,
            "pblanc_id": hit.pblanc_id,
            "title": hit.title,
            "distance": round(hit.best_distance, 4),
            "status": status,
            "reason": reason,
            "check_items": checks,
            "benefits": _benefits(hit),
            "confidence": sig.get("conf"),
            "judged_by": judged_by,
        })

    # SQL에서 걸러진 공고. 사유가 결정론적이라 모델을 부르지 않는다.
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
            "confidence": None,
            "judged_by": "sql",
        })

    # eligible 안에서는 확신 높은 것을 위로. unknown·ineligible 은 확신도가
    # 사용자에게 의미 없으므로 관련도(거리)만 본다.
    order = {"eligible": 0, "unknown": 1, "ineligible": 2}
    results.sort(key=lambda r: (
        order.get(r["status"], 3),
        -(r["confidence"] or 0) if r["status"] == "eligible" else 0,
        r["distance"] if r["distance"] is not None else 99,
    ))

    logger.info("판정: 후보 %d / 탈락 %d", len(result.hits), len(result.rejected))
    return {"query": result.query_text, "results": results}