"""판정 규칙. 추출된 값과 정답값(expected)을 비교해 checks · status · message 를 만든다.

기준 문서: ai/docs/05_ocr_contract.md '판정 규칙' · '서류별 기준'.
확실한 경우만 실패시킨다. 애매하면 통과 + WARN (예상 못 한 서류 하나로 사용자가 막히는 편이 더 나쁘다).
"""

import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from app.ocr.extract import norm
from app.ocr.schemas import Check, Expected, Extracted

MIN_CONFIDENCE = 0.6     # 샘플 6장 실측 0.862~0.984
MIN_LINES = 15           # 샘플 6장 최소 26줄
DEFAULT_VALID_DAYS = 90  # 홈택스 증명서의 진위확인 기간과 같게


@dataclass(frozen=True)
class Rule:
    titles: tuple = ()                   # 문서 제목 별칭 (공백 제거 후 포함 여부). 비어 있으면 제목 대조 안 함
    match_owner: bool = False            # 대표자명 불일치를 FAIL 로 볼지
    valid_by_until: bool = False         # 서류의 유효기간으로 판단 (못 읽으면 발급일 + 90일)
    expects_open_date: bool = False      # 개업일이 적힌 서류 (못 읽으면 WARN, 아니면 SKIP)


# 키는 DB 의 doc_name 과 글자까지 같아야 한다 (loan_document.doc_name · program_document.doc_name)
RULES = {
    "사업자등록증명원": Rule(titles=("사업자등록증명",), match_owner=True, expects_open_date=True),
    "부가가치세 과세표준증명원": Rule(titles=("부가가치세과세표준증명",), match_owner=True),
    # 법인이면 '성명(상호)' 칸에 회사명만 있어 대표자명을 대조하지 않는다
    "국세 납세증명서": Rule(titles=("납세증명서",), valid_by_until=True),
    # 실제 제목은 '중소기업 확인서 [소기업(소상공인)]'
    "소상공인확인서": Rule(titles=("중소기업확인서", "소상공인확인서"), match_owner=True, valid_by_until=True),
}
DEFAULT_RULE = Rule()   # 규칙 표에 없는 서류 (지원사업 서류 등): 사업자번호 + 판독 가능 + 발급일 90일

MESSAGES = {
    "readable": "서류를 읽을 수 없습니다. 흐리거나 잘리지 않은 파일로 다시 올려주세요.",
    "doc_title": "요청한 서류({document_name})가 아닌 것 같습니다. 서류를 확인해 주세요.",
    "brn": "서류의 사업자등록번호가 등록된 사업자 정보와 다릅니다.",
    "owner_name": "서류의 대표자명이 회원 정보와 다릅니다.",
    "validity": "유효기간이 지난 서류입니다 ({date}). 새로 발급받아 올려주세요.",
}

# 시도 전체 이름 → 표준 약칭 (business_info.region 표기). 긴 이름부터 맞춰야 '전라남도' 가 '전라' 에 걸리지 않는다
SIDO_ALIASES = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원",
    "충청북도": "충북", "충청남도": "충남", "전북특별자치도": "전북", "전라북도": "전북",
    "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
}
SIDO_SHORT = ("서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
              "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주")


@dataclass
class Judgement:
    status: str
    message: str | None
    checks: list = field(default_factory=list)


def rule_for(document_name: str) -> Rule:
    return RULES.get(document_name, DEFAULT_RULE)


def judge(document_name: str, expected: Expected, extracted: Extracted,
          confidence: float, line_count: int, full_text: str, today: date) -> Judgement:
    rule = rule_for(document_name)

    readable = _check_readable(confidence, line_count)
    if readable.level == "FAIL":
        # 못 읽은 서류로 불일치를 판단하면 오판이 난다 → 나머지는 보지 않는다
        skipped = [Check(field=f, result="SKIP", level="SKIP", detail="판독 불가")
                   for f in ("doc_title", "brn", "owner_name", "business_name", "address", "open_date")]
        checks = [readable] + skipped[:3] + [Check(field="validity", result="NOT_FOUND", level="SKIP",
                                                    detail="판독 불가")] + skipped[3:]
        return _finish(checks, document_name)

    checks = [
        readable,
        _check_title(rule, extracted.doc_title, full_text),
        _check_brn(expected.brn, extracted.brn),
        _check_owner(rule, expected.owner_name, extracted.owner_name),
        _check_validity(rule, extracted.issue_date, extracted.valid_until, today),
        _check_business_name(expected.business_name, extracted.business_name),
        _check_address(expected.address, expected.region, extracted.address),
        _check_open_date(rule, expected.open_date, extracted.open_date),
    ]
    return _finish(checks, document_name)


def _finish(checks: list, document_name: str) -> Judgement:
    # checks 순서가 곧 message 우선순위다 (readable → doc_title → brn → owner_name → validity)
    for c in checks:
        if c.level == "FAIL":
            template = MESSAGES[c.field]
            date_text = c.detail.split()[1] if c.field == "validity" and c.detail else ""
            return Judgement("FAILED", template.format(document_name=document_name, date=date_text), checks)
    return Judgement("PASSED", None, checks)


# --- 항목별 판정 ------------------------------------------------------------

def _ok(field_name, result, detail=None):
    return Check(field=field_name, result=result, level="OK", detail=detail)


def _warn(field_name, result, detail=None):
    return Check(field=field_name, result=result, level="WARN", detail=detail)


def _fail(field_name, result, detail=None):
    return Check(field=field_name, result=result, level="FAIL", detail=detail)


def _skip(field_name, detail):
    return Check(field=field_name, result="SKIP", level="SKIP", detail=detail)


def _check_readable(confidence: float, line_count: int) -> Check:
    detail = f"신뢰도 {confidence:.3f}, {line_count}줄"
    if confidence < MIN_CONFIDENCE or line_count < MIN_LINES:
        return _fail("readable", "UNREADABLE", detail)
    return _ok("readable", "VALID", detail)


def _check_title(rule: Rule, title: str | None, full_text: str) -> Check:
    if not rule.titles:
        return _skip("doc_title", "서류별 기준이 없는 서류")
    aliases = [norm(t) for t in rule.titles]
    # GMS 가 제목을 다르게 옮겨 적어도, 인식된 전체 텍스트에 제목이 있으면 맞는 서류로 본다 (보수적 판정)
    if title and any(a in norm(title) for a in aliases):
        return _ok("doc_title", "MATCH", title)
    if any(a in norm(full_text) for a in aliases):
        return _ok("doc_title", "MATCH", title or "본문에서 제목 확인")
    if not title:
        return _warn("doc_title", "NOT_FOUND", "제목을 읽지 못함")
    return _fail("doc_title", "MISMATCH", title)


def _check_brn(expected: str | None, extracted: str | None) -> Check:
    if not expected:
        return _skip("brn", "대조할 사업자등록번호 없음")
    if not extracted:
        return _warn("brn", "NOT_FOUND", "사업자등록번호를 읽지 못함")
    want = re.sub(r"\D", "", expected)
    if extracted == want:
        return _ok("brn", "MATCH", extracted)
    return _fail("brn", "MISMATCH", f"서류 {extracted} / 등록 {want}")


def _check_owner(rule: Rule, expected: str | None, extracted: str | None) -> Check:
    if not rule.match_owner:
        return _skip("owner_name", "이 서류는 대표자명을 대조하지 않음")
    if not expected:
        return _skip("owner_name", "대조할 대표자명 없음")
    if not extracted:
        return _warn("owner_name", "NOT_FOUND", "대표자명을 읽지 못함")
    if "*" in extracted:
        return _skip("owner_name", f"마스킹된 이름 {extracted}")
    if norm(extracted) == norm(expected):
        return _ok("owner_name", "MATCH", extracted)
    return _fail("owner_name", "MISMATCH", f"서류 {extracted} / 등록 {expected}")


def _check_validity(rule: Rule, issue_date: date | None, valid_until: date | None, today: date) -> Check:
    # detail 의 두 번째 토막이 날짜여야 한다 (_finish 가 실패 메시지에 넣는다)
    if rule.valid_by_until and valid_until:
        if today <= valid_until:
            return _ok("validity", "VALID", f"유효기간 {valid_until.isoformat()} 까지")
        return _fail("validity", "EXPIRED", f"유효기간 {valid_until.isoformat()} 경과")

    # 유효기간이 없는 서류, 또는 유효기간을 못 읽은 경우 → 발급일 + 90일
    if not issue_date:
        return _warn("validity", "NOT_FOUND", "발급일·유효기간을 읽지 못함")
    if today <= issue_date + timedelta(days=DEFAULT_VALID_DAYS):
        return _ok("validity", "VALID", f"발급일 {issue_date.isoformat()}")
    return _fail("validity", "EXPIRED", f"발급일 {issue_date.isoformat()} ({DEFAULT_VALID_DAYS}일 경과)")


def _check_business_name(expected: str | None, extracted: str | None) -> Check:
    if not expected:
        return _skip("business_name", "대조할 상호 없음")
    if not extracted:
        return _warn("business_name", "NOT_FOUND", "상호를 읽지 못함")
    if norm(extracted) == norm(expected):
        return _ok("business_name", "MATCH", extracted)
    # (주)·띄어쓰기 차이가 흔해 불일치여도 통과시킨다
    return _warn("business_name", "MISMATCH", f"서류 {extracted} / 등록 {expected}")


def split_sido(address: str) -> tuple:
    """주소 → (시도 약칭, 나머지). 공백을 지운 뒤 비교한다 (OCR 이 '서울특별시영등포구' 처럼 공백을 먹는다)."""
    compact = norm(address)
    for full in sorted(SIDO_ALIASES, key=len, reverse=True):
        if compact.startswith(full):
            return SIDO_ALIASES[full], compact[len(full):]
    for short in SIDO_SHORT:
        if compact.startswith(short):
            return short, compact[len(short):]
    return None, compact


def _check_address(expected_address: str | None, expected_region: str | None, extracted: str | None) -> Check:
    if not expected_address and not expected_region:
        return _skip("address", "대조할 주소 없음")
    if not extracted:
        return _warn("address", "NOT_FOUND", "주소를 읽지 못함")

    sido, rest = split_sido(extracted)
    want_sido, want_rest = split_sido(expected_address or "")
    # business_info.region 이 시도 표준 표기다. '전남광주' 처럼 합친 표기는 둘 다 인정한다
    want_sido = expected_region or want_sido
    sido_ok = sido is not None and want_sido is not None and sido in want_sido

    # 시군구: 정답 주소에서 시도 다음 첫 토막 (예: '성동구', '용인시')
    tokens = (expected_address or "").split()
    sigungu = norm(tokens[1]) if len(tokens) >= 2 else ""
    sigungu_ok = not sigungu or rest.startswith(sigungu)

    detail = f"서류 {sido or '?'} {rest[:len(sigungu) or 6]} / 등록 {want_sido or '?'} {sigungu}"
    if sido_ok and sigungu_ok:
        return _ok("address", "MATCH", detail)
    # 도로명/지번 혼용·시도 표기 차이가 흔해 불일치여도 통과시킨다
    return _warn("address", "MISMATCH", detail)


def _check_open_date(rule: Rule, expected: date | None, extracted: date | None) -> Check:
    if expected is None:
        return _skip("open_date", "대조할 개업일 없음")
    if not extracted:
        if rule.expects_open_date:
            return _warn("open_date", "NOT_FOUND", "개업일을 읽지 못함")
        return _skip("open_date", "이 서류에 없는 항목")
    if extracted == expected:
        return _ok("open_date", "MATCH", extracted.isoformat())
    return _warn("open_date", "MISMATCH", f"서류 {extracted.isoformat()} / 등록 {expected.isoformat()}")
