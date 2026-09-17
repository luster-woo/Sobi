"""서류 검증 본체: 이미지 변환 → OCR → 칸 병합 → 규칙 추출 + GMS 추출 → 판정.

기준 문서: ai/docs/05_ocr_contract.md
"""

import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi.concurrency import run_in_threadpool

from app.ocr import engine, extract, prompt, rules
from app.ocr.extract import FileUnreadableError  # noqa: F401  (라우터가 이 모듈에서 가져다 쓴다)
from app.ocr.schemas import Expected, Extracted, VerifyResponse

logger = logging.getLogger(__name__)

KOREA = ZoneInfo("Asia/Seoul")


def recognize(data: bytes, ext: str):
    """CPU 를 오래 쓰는 동기 구간. (인식된 줄, 병합된 칸)"""
    lines = []
    for page, image in enumerate(extract.to_images(data, ext)):
        lines += extract.collect_lines(engine.predict(image), page)
    return lines, extract.merge_cells(lines)


async def verify(data: bytes, ext: str, document_name: str, expected: Expected,
                 today: date | None = None) -> VerifyResponse:
    """파일이 깨졌으면 FileUnreadableError. 그 외에는 항상 판정 결과(PASSED/FAILED)를 돌려준다."""
    lines, cells = await run_in_threadpool(recognize, data, ext)

    confidence = sum(ln.score for ln in lines) / len(lines) if lines else 0.0
    rule_fields = extract.extract_rule_fields(cells)
    full_text = "\n".join(c.text for c in cells)

    # 못 읽은 서류는 GMS 를 부르지 않는다 (판정도 나머지 항목을 보지 않음)
    readable = confidence >= rules.MIN_CONFIDENCE and len(lines) >= rules.MIN_LINES
    gms_fields = await prompt.parse_fields([c.text for c in cells]) if readable \
        else {k: None for k in prompt.FIELDS}

    extracted = Extracted(
        doc_title=gms_fields["doc_title"],
        issuer=gms_fields["issuer"],
        issue_date=_to_date(rule_fields.issue_date),
        valid_until=_to_date(rule_fields.valid_until),
        brn=rule_fields.brn,
        owner_name=gms_fields["owner_name"],
        business_name=gms_fields["business_name"],
        address=gms_fields["address"],
        open_date=_to_date(rule_fields.open_date),
    )

    judgement = rules.judge(
        document_name=document_name,
        expected=expected,
        extracted=extracted,
        confidence=confidence,
        line_count=len(lines),
        full_text=full_text,
        today=today or datetime.now(KOREA).date(),
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
