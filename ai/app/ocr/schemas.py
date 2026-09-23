"""OCR 검증 API 요청·응답 모델. 필드 의미는 ai/docs/05_ocr_contract.md 가 기준이다."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Status = Literal["PASSED", "FAILED"]
Level = Literal["FAIL", "WARN", "OK", "SKIP"]
CheckField = Literal[
    "readable", "doc_title", "brn", "owner_name", "birth_date",
    "validity", "business_name", "address", "open_date",
]
CheckResult = Literal[
    "MATCH", "MISMATCH", "NOT_FOUND", "SKIP",
    "VALID", "UNREADABLE", "EXPIRED",
]


class Expected(BaseModel):
    """백엔드가 DB 에서 꺼내 보내는 대조용 정답값.

    AI 서버는 DB 를 보지 않는다. 모든 값은 null 을 허용하고, 키가 없어도 null 로 본다.
    null 인 항목은 대조하지 않는다(SKIP).
    """

    brn: str | None = None            # business_info.brn. 하이픈 유무 무관
    owner_name: str | None = None     # users.name
    birth_date: date | None = None    # users.birth_date. 등본·지방세 납세증명서 등 개인 서류 대조용
    business_name: str | None = None  # business_info.business_name
    address: str | None = None        # business_info.address
    region: str | None = None         # business_info.region (시도 표준 표기)
    open_date: date | None = None     # business_info.open_date


class Check(BaseModel):
    """항목별 판정 근거. 디버깅·시연 설명용이라 백엔드는 저장하지 않아도 된다."""

    field: CheckField
    result: CheckResult
    level: Level
    detail: str | None = None


class Extracted(BaseModel):
    """서류에서 읽은 값. 못 읽으면 null. 이름·상호·주소는 서류에 적힌 그대로(OCR 오타 포함)."""

    doc_title: str | None = None
    issuer: str | None = None
    issue_date: date | None = None
    valid_until: date | None = None
    brn: str | None = None            # 숫자 10자리
    owner_name: str | None = None     # 통장사본이면 예금주
    birth_date: date | None = None
    business_name: str | None = None
    address: str | None = None
    open_date: date | None = None
    account_no: str | None = None     # 통장사본


class VerifyResponse(BaseModel):
    status: Status
    message: str | None = None        # 사용자에게 보여줄 한 문장. PASSED 면 null
    checks: list[Check] = Field(default_factory=list)
    extracted: Extracted = Field(default_factory=Extracted)
    confidence: float                 # OCR 평균 신뢰도 0~1
    elapsed_ms: int = 0
