"""서류 검증 본체: 이미지 변환 → OCR → 칸 병합 → 규칙 추출 + GMS 추출 → 판정.

기준 문서: ai/docs/05_ocr_contract.md
"""

import asyncio
import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.ocr import engine, extract, prompt, rules
from app.ocr.extract import FileUnreadableError  # noqa: F401  (라우터가 이 모듈에서 가져다 쓴다)
from app.ocr.schemas import Expected, Extracted, VerifyResponse

logger = logging.getLogger(__name__)

KOREA = ZoneInfo("Asia/Seoul")


def recognize(data: bytes, ext: str, max_pages: int = extract.MAX_PDF_PAGES):
    """CPU 를 오래 쓰는 동기 구간. (인식된 줄, 병합된 칸)"""
    lines = []
    for page, image in enumerate(extract.to_images(data, ext, max_pages)):
        lines += extract.collect_lines(engine.predict(image), page)
    return lines, extract.merge_cells(lines)


async def verify(data: bytes, ext: str, document_name: str, expected: Expected,
                 today: date | None = None) -> VerifyResponse:
    """파일이 깨졌으면 FileUnreadableError. 그 외에는 항상 판정 결과(PASSED/FAILED)를 돌려준다."""
    rule = rules.rule_for(document_name)
    # 스레드 풀이 아니라 OCR 전용 스레드에서 돌린다. 엔진을 만든 스레드와 같아야 한다 (engine.EXECUTOR)
    lines, cells = await asyncio.get_running_loop().run_in_executor(
        engine.EXECUTOR, recognize, data, ext, rule.max_pages)

    confidence = sum(ln.score for ln in lines) / len(lines) if lines else 0.0
    rule_fields = extract.extract_rule_fields(cells)
    full_text = "\n".join(c.text for c in cells)

    # 못 읽은 서류는 GMS 를 부르지 않는다 (판정도 나머지 항목을 보지 않음).
    # 등본·가족관계증명서처럼 남의 주민번호까지 찍히는 개인 서류도 보내지 않는다 (규칙 추출만)
    readable = confidence >= rules.MIN_CONFIDENCE and len(lines) >= rule.min_lines
    gms_fields = await prompt.parse_fields([c.text for c in cells]) if readable and not rule.personal \
        else {k: None for k in prompt.FIELDS}

    owner_name = gms_fields["owner_name"]
    if rule.owner == rules.OWNER_HOLDER:
        # 예금주는 규칙('님' · '예금주' 라벨)이 먼저. 법인 통장이면 GMS 가 상호 칸에 넣기도 한다
        owner_name = rule_fields.account_holder or owner_name or gms_fields["business_name"]
    elif rule.owner == rules.OWNER_IN_TEXT and expected.owner_name \
            and extract.norm(expected.owner_name) in extract.norm(full_text):
        owner_name = expected.owner_name

    birth_dates = rule_fields.birth_dates
    want_birth = expected.birth_date.isoformat() if expected.birth_date else None
    birth = want_birth if want_birth in birth_dates else (birth_dates[0] if birth_dates else None)

    extracted = Extracted(
        doc_title=gms_fields["doc_title"],
        issuer=gms_fields["issuer"],
        issue_date=_to_date(rule_fields.issue_date),
        valid_until=_to_date(rule_fields.valid_until),
        brn=rule_fields.brn,
        owner_name=owner_name,
        birth_date=_to_date(birth),
        business_name=gms_fields["business_name"],
        address=gms_fields["address"],
        open_date=_to_date(rule_fields.open_date),
        account_no=rule_fields.account_no if rule.owner == rules.OWNER_HOLDER else None,
    )

    judgement = rules.judge(
        document_name=document_name,
        expected=expected,
        extracted=extracted,
        confidence=confidence,
        line_count=len(lines),
        full_text=full_text,
        title_text=extract.head_text(cells),
        today=today or datetime.now(KOREA).date(),
        birth_dates=birth_dates,
    )

    return VerifyResponse(
        status=judgement.status,
        message=judgement.message,
        checks=judgement.checks,
        extracted=extracted,
        confidence=round(confidence, 3),
    )


def _to_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None
