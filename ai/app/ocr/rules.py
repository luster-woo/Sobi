"""판정 규칙. 추출된 값과 정답값(expected)을 비교해 checks · status · message 를 만든다.

기준 문서: ai/docs/05_ocr_contract.md '판정 규칙' · '서류별 기준'.
확실한 경우만 실패시킨다. 애매하면 통과 + WARN (예상 못 한 서류 하나로 사용자가 막히는 편이 더 나쁘다).
"""

import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from app.ocr.extract import norm
from app.ocr.schemas import Check, Expected, Extracted

MIN_CONFIDENCE = 0.6     # 샘플 10장 실측 0.853~0.984
MIN_LINES = 15           # 샘플 10장 최소 26줄
DEFAULT_VALID_DAYS = 90  # 홈택스 증명서의 진위확인 기간과 같게

# 불일치를 어떻게 다룰지
FAIL, WARN, SKIP = "FAIL", "WARN", "SKIP"
# 본인 확인 방식
OWNER_REPRESENTATIVE = "REPRESENTATIVE"   # 대표자 칸 (GMS 가 뽑은 이름) = users.name
OWNER_HOLDER = "HOLDER"                   # 통장 예금주 = users.name 또는 상호
OWNER_IN_TEXT = "IN_TEXT"                 # 본문 어딘가에 users.name 이 있는지 (개인 서류. 불일치 FAIL 없음)
# 유효성 기준
VALIDITY_ISSUED = "ISSUED"   # 발급일 + valid_days
VALIDITY_UNTIL = "UNTIL"     # 서류에 적힌 유효기간 (못 읽으면 발급일 + valid_days)
VALIDITY_NONE = "NONE"       # 검사 안 함 (사업자등록증·통장처럼 발급일이 유효성과 무관한 서류)


@dataclass(frozen=True)
class Rule:
    titles: tuple = ()                   # 문서 제목 별칭 (공백 제거 후 포함 여부). 비어 있으면 제목 대조 안 함
    exclude_titles: tuple = ()           # 이 말이 제목에 있으면 다른 서류 (국세 납세증명서 칸의 '지방세납세증명서')
    brn: str = FAIL                      # 사업자등록번호 불일치 처리: FAIL · WARN · SKIP(대조 안 함)
    owner: str | None = None             # 본인 확인 방식. None 이면 대조 안 함
    match_birth: bool = False            # 생년월일 대조 (불일치 FAIL)
    validity: str = VALIDITY_ISSUED
    valid_days: int = DEFAULT_VALID_DAYS
    expects_open_date: bool = False      # 개업일이 적힌 서류 (못 읽으면 WARN, 아니면 SKIP)
    business_fields: bool = True         # 상호·사업장 주소가 적힌 서류. 아니면 두 항목 SKIP
    personal: bool = False               # 주민번호가 여러 개 찍히는 개인 서류 → GMS 로 보내지 않는다
    min_lines: int = MIN_LINES           # 판독 가능으로 볼 최소 줄 수
    max_pages: int = 3                   # PDF 에서 인식할 페이지 수


BUSINESS_REGISTRATION = Rule(titles=("사업자등록증",), owner=OWNER_REPRESENTATIVE,
                             validity=VALIDITY_NONE, expects_open_date=True)
BUSINESS_CERTIFICATE = Rule(titles=("사업자등록증명",), owner=OWNER_REPRESENTATIVE, expects_open_date=True)
# 서식 2쪽은 첨부서류·동의서 부표라 인식하지 않는다 (P1 샘플 28초 → 17초)
LOCAL_TAX = Rule(titles=("지방세납세증명서", "지방세완납증명서"), owner=OWNER_REPRESENTATIVE, match_birth=True,
                 validity=VALIDITY_UNTIL, max_pages=1)
# 개인 서류: 사업자번호·상호·사업장 주소가 없고, 이름은 본문에서 찾고, 생년월일로 본인을 가린다
_PERSONAL = dict(brn=SKIP, owner=OWNER_IN_TEXT, match_birth=True, business_fields=False, personal=True)
RESIDENT_COPY = ("주민등록표(등본)", "주민등록등본", "(등본)", "이등본은")
RESIDENT_ABSTRACT = ("주민등록표(초본)", "주민등록초본", "(초본)", "이초본은")

# 키는 DB 의 doc_name 과 글자까지 같아야 한다 (loan_document.doc_name · program_document.doc_name).
# 지원사업 서류명은 표기가 제각각이라 여기 없으면 classify() 가 이름으로 규칙을 고른다
RULES = {
    # --- 대출 서류 (loan_document) ---
    "사업자등록증명원": BUSINESS_CERTIFICATE,
    "부가가치세 과세표준증명원": Rule(titles=("부가가치세과세표준증명",), owner=OWNER_REPRESENTATIVE),
    # 법인이면 '성명(상호)' 칸에 회사명만 있어 대표자명을 대조하지 않는다.
    # 국세청 서류 제목은 그냥 '납세증명서' 라서 지방세 납세증명서도 별칭에 걸린다 → 제외어로 가린다
    "국세 납세증명서": Rule(titles=("납세증명서",), exclude_titles=("지방세",), validity=VALIDITY_UNTIL),
    # 실제 제목은 '중소기업 확인서 [소기업(소상공인)]'
    "소상공인확인서": Rule(titles=("중소기업확인서", "소상공인확인서"), owner=OWNER_REPRESENTATIVE,
                    validity=VALIDITY_UNTIL),
    # --- 지원사업 서류 (program_document) ---
    # 발급일이 개업 때이거나 재발급일이라 유효기간을 보지 않는다. 제목 별칭이 사업자등록증명도 받는다
    "사업자등록증": BUSINESS_REGISTRATION,
    "지방세 납세증명서": LOCAL_TAX,
    # '국세/지방세 납세증명서' 한 칸에 둘 중 하나를 받는 경우
    "국세·지방세 납세증명서": Rule(titles=("납세증명서", "완납증명서"), validity=VALIDITY_UNTIL),
    # 제목 '주 민 등 록 표' 는 파란 장식 글씨라 OCR 이 놓친다 → '(등본)' · '이 등본은' 도 별칭으로
    "주민등록등본": Rule(titles=RESIDENT_COPY, **_PERSONAL),
    "주민등록초본": Rule(titles=RESIDENT_ABSTRACT, **_PERSONAL),
    "주민등록등초본": Rule(titles=RESIDENT_COPY + RESIDENT_ABSTRACT, **_PERSONAL),
    "가족관계증명서": Rule(titles=("가족관계증명서",), **_PERSONAL),
    # 신분증은 글자 수가 적다
    "신분증": Rule(titles=("주민등록증", "운전면허증"), validity=VALIDITY_NONE, min_lines=5, **_PERSONAL),
    # 통장에는 '통장사본' 이라는 제목이 없다. 예금주는 이름 뒤 '님' 으로만 표시된다
    "통장사본": Rule(titles=("계좌번호", "예금주", "통장"), brn=SKIP, owner=OWNER_HOLDER,
                  validity=VALIDITY_NONE, business_fields=False),
    # 임대인이 사업자면 그 사업자번호가 찍힌다 → 대조하지 않는다
    "임대차계약서": Rule(titles=("임대차계약서", "임대차계약"), brn=SKIP, owner=OWNER_IN_TEXT,
                    validity=VALIDITY_NONE, business_fields=False, personal=True),
}
# 규칙 표에 없는 서류: 판독 가능 + 사업자번호(불일치는 WARN). 견적서·가맹계약서처럼 남의 사업자번호가 찍히는 서류가 있다
DEFAULT_RULE = Rule(brn=WARN, validity=VALIDITY_NONE)
# 외주업체·광고주·근로자 등 신청자 본인 것이 아닌 서류
THIRD_PARTY_RULE = Rule(brn=SKIP, validity=VALIDITY_NONE, business_fields=False)

THIRD_PARTY_WORDS = ("외주", "거래처", "광고주", "설치업체", "철거업체", "근로자", "직원")
TAX_WORDS = ("납세", "완납", "납부증명", "납입증명")
# '사업자등록증 또는 사업자등록증명원' 처럼 대안을 나열한 이름
ALTERNATIVE_RE = re.compile(r"또는|혹은|,")

MESSAGES = {
    "readable": "서류를 읽을 수 없습니다. 흐리거나 잘리지 않은 파일로 다시 올려주세요.",
    "doc_title": "요청한 서류({document_name})가 아닌 것 같습니다. 서류를 확인해 주세요.",
    "brn": "서류의 사업자등록번호가 등록된 사업자 정보와 다릅니다.",
    "owner_name": "서류의 대표자명이 회원 정보와 다릅니다.",
    "account_holder": "통장의 예금주가 회원 정보와 다릅니다.",
    "birth_date": "서류의 생년월일이 회원 정보와 다릅니다.",
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

FIELD_ORDER = ("readable", "doc_title", "brn", "owner_name", "birth_date",
               "validity", "business_name", "address", "open_date")


@dataclass
class Judgement:
    status: str
    message: str | None
    checks: list = field(default_factory=list)


# --- 서류명 → 규칙 --------------------------------------------------------------

def rule_for(document_name: str) -> Rule:
    return RULES.get(document_name) or classify(document_name)


def classify(document_name: str) -> Rule:
    """지원사업 서류명('사업자 등록증 사본', '국·지방세 완납 증명서', '주민증록표등본')을 규칙으로.

    확실히 알아볼 수 있는 이름만 서류별 규칙을 태우고, 나머지는 기본 규칙이다.
    """
    n = norm(document_name)
    # '상시근로자 확인서류' 는 신청자 사업장의 근로자 수 증빙이라 남의 서류가 아니다
    if any(w in n.replace("상시근로자", "") for w in THIRD_PARTY_WORDS):
        return THIRD_PARTY_RULE

    # 세금은 '국세/지방세', '국세 및 지방세' 처럼 한 칸에 둘을 쓰므로 대안 분리보다 먼저 본다
    if "세" in n and any(w in n for w in TAX_WORDS) and "," not in n:
        local = "지방세" in n
        national = "국세" in n or n.startswith("국·") or n.startswith("국.")
        if local and not national:
            return LOCAL_TAX
        if national and not local:
            return RULES["국세 납세증명서"]
        return RULES["국세·지방세 납세증명서"]

    parts = [p for p in ALTERNATIVE_RE.split(n) if p]
    if len(parts) > 1:
        rules = {_classify_one(p) for p in parts}
        if rules <= {BUSINESS_REGISTRATION, BUSINESS_CERTIFICATE}:
            return BUSINESS_REGISTRATION        # 제목 별칭 '사업자등록증' 이 증명원도 받는다
        return rules.pop() if len(rules) == 1 else DEFAULT_RULE
    return _classify_one(n)


def _classify_one(n: str) -> Rule:
    if "사업자등록증명" in n or "사업자증명" in n:
        return BUSINESS_CERTIFICATE
    if "사업자등록증" in n or "사업자등롱증" in n:
        return BUSINESS_REGISTRATION
    if "매출" not in n and "면세" not in n and "부가" in n and ("과세" in n or "증명" in n):
        return RULES["부가가치세 과세표준증명원"]
    if "소상공인확인" in n or ("중소기업" in n and "확인" in n):
        return RULES["소상공인확인서"]
    if "통장" in n:
        return RULES["통장사본"]
    if "주민등록" in n or "주민증록" in n or "등·초본" in n or "등초본" in n:
        copy = "등본" in n or "등·초본" in n or "등초본" in n
        abstract = "초본" in n
        if copy and abstract:
            return RULES["주민등록등초본"]
        if copy:
            return RULES["주민등록등본"]
        if abstract:
            return RULES["주민등록초본"]
    if "가족관계" in n:
        return RULES["가족관계증명서"]
    if "신분증" in n or "주민등록증" in n or "운전면허" in n:
        return RULES["신분증"]
    if "임대차" in n or "임차계약" in n:
        return RULES["임대차계약서"]
    return DEFAULT_RULE


# --- 판정 ------------------------------------------------------------------------

def judge(document_name: str, expected: Expected, extracted: Extracted,
          confidence: float, line_count: int, full_text: str, today: date,
          birth_dates: tuple = (), title_text: str | None = None) -> Judgement:
    """birth_dates: 서류에서 찾은 생년월일 후보 전부 (extracted.birth_date 는 그중 하나만 담는다)
    title_text: 제목을 찾을 범위 (첫 페이지 윗부분). 없으면 full_text 전체"""
    rule = rule_for(document_name)

    readable = _check_readable(confidence, line_count, rule.min_lines)
    if readable.level == FAIL:
        # 못 읽은 서류로 불일치를 판단하면 오판이 난다 → 나머지는 보지 않는다
        checks = [readable] + [
            Check(field=f, result="NOT_FOUND" if f == "validity" else "SKIP", level=SKIP, detail="판독 불가")
            for f in FIELD_ORDER[1:]]
        return _finish(checks, document_name, rule)

    if not birth_dates and extracted.birth_date:
        birth_dates = (extracted.birth_date.isoformat(),)
    checks = [
        readable,
        _check_title(rule, extracted.doc_title, full_text if title_text is None else title_text),
        _check_brn(rule, expected.brn, extracted.brn),
        _check_owner(rule, expected, extracted.owner_name, full_text),
        _check_birth(rule, expected, birth_dates),
        _check_validity(rule, extracted.issue_date, extracted.valid_until, today),
        _check_business_name(rule, expected.business_name, extracted.business_name),
        _check_address(rule, expected.address, expected.region, extracted.address),
        _check_open_date(rule, expected.open_date, extracted.open_date),
    ]
    return _finish(checks, document_name, rule)


def _finish(checks: list, document_name: str, rule: Rule) -> Judgement:
    # checks 순서가 곧 message 우선순위다 (readable → doc_title → brn → owner_name → birth_date → validity)
    for c in checks:
        if c.level == FAIL:
            key = "account_holder" if c.field == "owner_name" and rule.owner == OWNER_HOLDER else c.field
            date_text = c.detail.split()[1] if c.field == "validity" and c.detail else ""
            return Judgement("FAILED", MESSAGES[key].format(document_name=document_name, date=date_text), checks)
    return Judgement("PASSED", None, checks)


# --- 항목별 판정 ------------------------------------------------------------

def _ok(field_name, result, detail=None):
    return Check(field=field_name, result=result, level="OK", detail=detail)


def _warn(field_name, result, detail=None):
    return Check(field=field_name, result=result, level=WARN, detail=detail)


def _fail(field_name, result, detail=None):
    return Check(field=field_name, result=result, level=FAIL, detail=detail)


def _skip(field_name, detail):
    return Check(field=field_name, result="SKIP", level=SKIP, detail=detail)


def _check_readable(confidence: float, line_count: int, min_lines: int = MIN_LINES) -> Check:
    detail = f"신뢰도 {confidence:.3f}, {line_count}줄"
    if confidence < MIN_CONFIDENCE or line_count < min_lines:
        return _fail("readable", "UNREADABLE", detail)
    return _ok("readable", "VALID", detail)


def _check_title(rule: Rule, title: str | None, head: str) -> Check:
    if not rule.titles:
        return _skip("doc_title", "서류별 기준이 없는 서류")
    aliases = [norm(t) for t in rule.titles]
    excludes = [norm(t) for t in rule.exclude_titles]

    def matches(text):
        n = norm(text)
        return any(a in n for a in aliases) and not any(x in n for x in excludes)

    # GMS 가 제목을 다르게 옮겨 적어도, 첫 페이지 윗부분에 제목이 있으면 맞는 서류로 본다 (보수적 판정).
    # 본문 전체를 보면 첨부서류란의 '사업자등록증 1부' 같은 언급에 걸린다.
    # 제외어는 윗부분이 아니라 제목에서만 본다 (안내문에 '지방세' 가 나올 수 있다)
    if title and matches(title):
        return _ok("doc_title", "MATCH", title)
    title_excluded = title and any(x in norm(title) for x in excludes)
    if not title_excluded and any(a in norm(head) for a in aliases):
        return _ok("doc_title", "MATCH", title or "본문에서 제목 확인")
    if not title:
        return _warn("doc_title", "NOT_FOUND", "제목을 읽지 못함")
    return _fail("doc_title", "MISMATCH", title)


def _check_brn(rule: Rule, expected: str | None, extracted: str | None) -> Check:
    if rule.brn == SKIP:
        return _skip("brn", "이 서류는 사업자등록번호를 대조하지 않음")
    if not expected:
        return _skip("brn", "대조할 사업자등록번호 없음")
    if not extracted:
        return _warn("brn", "NOT_FOUND", "사업자등록번호를 읽지 못함")
    want = re.sub(r"\D", "", expected)
    if extracted == want:
        return _ok("brn", "MATCH", extracted)
    detail = f"서류 {extracted} / 등록 {want}"
    return _fail("brn", "MISMATCH", detail) if rule.brn == FAIL else _warn("brn", "MISMATCH", detail)


def _check_owner(rule: Rule, expected: Expected, extracted: str | None, full_text: str) -> Check:
    if rule.owner is None:
        return _skip("owner_name", "이 서류는 대표자명을 대조하지 않음")
    if not expected.owner_name:
        return _skip("owner_name", "대조할 이름 없음")

    if rule.owner == OWNER_IN_TEXT:
        # 개인 서류는 규칙으로 이름 칸을 특정하기 어렵고 GMS 에도 보내지 않는다.
        # OCR 오타('김표준' → '김표춘')로 못 찾을 수 있어 불일치는 FAIL 하지 않는다. 본인 여부는 생년월일로 가린다
        if norm(expected.owner_name) in norm(full_text):
            return _ok("owner_name", "MATCH", "본문에서 이름 확인")
        return _warn("owner_name", "NOT_FOUND", "본문에서 이름을 찾지 못함")

    if not extracted:
        return _warn("owner_name", "NOT_FOUND", "예금주를 읽지 못함" if rule.owner == OWNER_HOLDER
                     else "대표자명을 읽지 못함")
    if "*" in extracted:
        return _skip("owner_name", f"마스킹된 이름 {extracted}")

    if rule.owner == OWNER_HOLDER:
        # 개인사업자는 대표자 명의, 법인은 법인 명의 통장이 흔하다 → 둘 중 하나면 본인
        wants = [w for w in (expected.owner_name, expected.business_name) if w]
        if any(_holder_key(extracted) == _holder_key(w) for w in wants):
            return _ok("owner_name", "MATCH", f"예금주 {extracted}")
        return _fail("owner_name", "MISMATCH", f"예금주 {extracted} / 등록 {' · '.join(wants)}")

    if norm(extracted) == norm(expected.owner_name):
        return _ok("owner_name", "MATCH", extracted)
    return _fail("owner_name", "MISMATCH", f"서류 {extracted} / 등록 {expected.owner_name}")


def _holder_key(name: str) -> str:
    """예금주 비교용: 공백·'님'·법인 표기 제거"""
    n = norm(name)
    n = re.sub(r"님$", "", n)
    return re.sub(r"\(주\)|㈜|주식회사|\(유\)|유한회사|\(사\)|사단법인", "", n)


def is_corporation(brn: str | None) -> bool:
    """사업자등록번호 가운데 두 자리 81~88 은 법인. 법인 서류의 '주민등록번호' 칸에는 법인등록번호가 들어간다"""
    digits = re.sub(r"\D", "", brn or "")
    return len(digits) == 10 and "81" <= digits[3:5] <= "88"


def _check_birth(rule: Rule, expected: Expected, found: tuple) -> Check:
    if not rule.match_birth:
        return _skip("birth_date", "이 서류는 생년월일을 대조하지 않음")
    if expected.birth_date is None:
        return _skip("birth_date", "대조할 생년월일 없음")
    if not rule.personal and is_corporation(expected.brn):
        return _skip("birth_date", "법인 서류")
    if not found:
        if rule.personal:
            return _warn("birth_date", "NOT_FOUND", "생년월일을 읽지 못함")
        return _skip("birth_date", "서류에 생년월일 없음")   # 법인 서류에는 주민번호가 없다
    want = expected.birth_date.isoformat()
    if want in found:
        return _ok("birth_date", "MATCH", want)
    # 숫자는 이름보다 오인식이 적고, 등본은 세대원 전원의 생년월일 중 하나만 맞으면 된다
    return _fail("birth_date", "MISMATCH", f"서류 {', '.join(found)} / 등록 {want}")


def _check_validity(rule: Rule, issue_date: date | None, valid_until: date | None, today: date) -> Check:
    # detail 의 두 번째 토막이 날짜여야 한다 (_finish 가 실패 메시지에 넣는다)
    if rule.validity == VALIDITY_NONE:
        return _skip("validity", "이 서류는 유효기간을 검사하지 않음")
    if rule.validity == VALIDITY_UNTIL and valid_until:
        if today <= valid_until:
            return _ok("validity", "VALID", f"유효기간 {valid_until.isoformat()} 까지")
        return _fail("validity", "EXPIRED", f"유효기간 {valid_until.isoformat()} 경과")

    # 발급일 기준 서류, 또는 유효기간을 못 읽은 경우 → 발급일 + valid_days
    if not issue_date:
        return _warn("validity", "NOT_FOUND", "발급일·유효기간을 읽지 못함")
    if today <= issue_date + timedelta(days=rule.valid_days):
        return _ok("validity", "VALID", f"발급일 {issue_date.isoformat()}")
    return _fail("validity", "EXPIRED", f"발급일 {issue_date.isoformat()} ({rule.valid_days}일 경과)")


def _check_business_name(rule: Rule, expected: str | None, extracted: str | None) -> Check:
    if not rule.business_fields:
        return _skip("business_name", "이 서류에 없는 항목")
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


def _check_address(rule: Rule, expected_address: str | None, expected_region: str | None,
                   extracted: str | None) -> Check:
    if not rule.business_fields:
        return _skip("address", "이 서류에 없는 항목")   # 등본의 주소는 자택이다
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
