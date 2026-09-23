"""서류 파일 → 인식된 줄 → 규칙 추출 (사업자번호 · 발급일 · 유효기간 · 개업일 · 생년월일 · 예금주 · 계좌번호).

양식마다 라벨이 달라지는 값(대표자·상호·주소·제목·기관)은 prompt.py 가 GMS 로 뽑는다.
이 모듈은 PaddleOCR 을 import 하지 않는다(엔진은 engine.py). 그래서 규칙만 따로 테스트할 수 있다.

기준 문서: ai/docs/05_ocr_contract.md
"""

import re
from typing import NamedTuple, Optional

import numpy as np

MAX_PDF_PAGES = 3      # 계약서: PDF 는 앞 3페이지까지만 본다
TITLE_HEAD_CELLS = 15  # 제목을 찾을 첫 페이지 윗부분 칸 수 (첨부서류란의 '사업자등록증 1부' 같은 본문 언급을 피한다)
PDF_DPI = 200          # 스캔 문서 기준. 낮추면 작은 글씨를 놓친다

# 같은 칸으로 합칠 가로 간격(글자 높이 배수). 크게 잡는 편이 안전하다 —
# 라벨과 값이 한 칸으로 붙어도 strip_label 이 떼어내지만, 덜 합치면 '개 업 일' 처럼 라벨이 쪼개져 매칭을 놓친다.
# 실측: 자간 넓은 3글자 라벨은 2.4배, 다른 열(공동사업자 표)은 5배 → 그 사이인 4.0
CELL_GAP = 4.0
ROW_TOL = 0.6          # 같은 행으로 볼 세로 허용치 (글자 높이 배수)

# OCR 이 하이픈을 en dash(–)·em dash(—)로 읽는 경우가 있다 ('940311–*******'). 번호 정규식은 셋 다 받는다
DASH = "[-–—]"
# 사업자등록번호. 하이픈 필수 + 앞뒤 숫자 금지 → 주민(법인)등록번호·접수번호가 섞이지 않는다
BRN_RE = re.compile(rf"(?<!\d)\d{{3}}\s*{DASH}\s*\d{{2}}\s*{DASH}\s*\d{{5}}(?!\d)")
# 주민·법인등록번호 6-7자리 (뒷자리가 이미 * 로 가려진 것 포함). GMS 로 보내기 전에 가리고, 앞 6자리는 생년월일로 쓴다
ID_NUMBER_RE = re.compile(rf"(?<!\d)(\d{{6}})\s*{DASH}\s*([\d*]{{7}})(?!\d)")
# 계좌번호 '1005-800-985027' · '0010-1010-1010-1010'. 숫자 10~16자리는 검증기에서 본다
# 주민등록등본 상단 '신청인:김표준 ( 1994-03-11)'. 괄호 안 날짜만 본다 (신청일과 헷갈리지 않게)
APPLICANT_BIRTH_RE = re.compile(rf"신\s*청\s*인\s*[:：]?\s*[가-힣\s]{{2,10}}\(\s*(\d{{4}})\s*{DASH}\s*(\d{{1,2}})\s*{DASH}\s*(\d{{1,2}})")
# 예금주 라벨. 뒤에 공백·콜론·줄 끝이 와야 한다 ('예금주가 본인의…' 안내문은 제외)
HOLDER_LABEL_RE = re.compile(r"\s*예\s*금\s*주\s*명?(?:\s*[:：]\s*|\s+|$)")
ACCOUNT_RE = re.compile(rf"\d{{2,6}}(?:\s*{DASH}\s*\d{{2,8}}){{1,4}}")
# '2005년 03월 23일' / '2005.03.23' / '2005-03-23'. OCR 이 하이픈을 en dash 로 읽기도 한다
DATE_RE = re.compile(r"(\d{4})\s*[.\-–—년]\s*(\d{1,2})\s*[.\-–—월]\s*(\d{1,2})")
# '2026년 Year 09월 17일' 처럼 영문 병기 양식은 년·월 뒤에 글자가 끼어든다
KO_DATE_RE = re.compile(r"(\d{4})\s*년[^\d]{0,8}?(\d{1,2})\s*월[^\d]{0,8}?(\d{1,2})\s*일")

# 발급일 후보에서 뺄 칸: 발급일이 아닌 날짜가 적힌 곳
NOT_ISSUE_WORDS = ("유효기간", "개업", "등록일", "과세기간", "이주확인일", "생년월일", "신청인")
# 발급일이 찍히는 자리 근처에 나오는 말
ISSUE_HINTS = ("증명합니다", "확인합니다", "세무서장", "장관", "발급일")

# 값 칸에 라벨이 잡힌 경우를 걸러낸다 (공동사업자 표 헤더 '주민(사업자)등록번호' 같은 것)
LABEL_WORDS = ("등록번호", "성명", "상호", "법인명", "소재지", "개업", "업태", "종목", "처리기간")

# 라벨 후보는 구체적인 것부터. '등록번호' 를 먼저 보면 주민등록번호를 집으므로 뒤에 둔다
BRN_LABELS = ("사업자등록번호", "등록번호")
# OCR 이 '일' 글자를 놓치는 경우가 있어 '개업' 까지 허용한다. 날짜 검증기가 날짜만 통과시킨다
OPEN_DATE_LABELS = ("개업일", "개업연월일", "개업")
# 통장 예금주 줄('김 표 준 님')과 헷갈리는 안내 문구
NOT_HOLDER_WORDS = ("고객", "손님", "드리")


class FileUnreadableError(Exception):
    """파일을 이미지로 바꾸지 못함 (깨진 파일). 라우터가 400 으로 응답한다."""


class Line(NamedTuple):
    """OCR 이 인식한 한 줄(또는 병합된 칸). poly 는 [[x, y] x 4], 좌표를 못 받으면 None"""
    page: int
    text: str
    score: float
    poly: Optional[list]

    @property
    def left(self):
        return min(p[0] for p in self.poly)

    @property
    def right(self):
        return max(p[0] for p in self.poly)

    @property
    def top(self):
        return min(p[1] for p in self.poly)

    @property
    def bottom(self):
        return max(p[1] for p in self.poly)

    @property
    def center_y(self):
        return (self.top + self.bottom) / 2


class RuleFields(NamedTuple):
    brn: Optional[str]            # 숫자 10자리
    issue_date: Optional[str]     # YYYY-MM-DD
    valid_until: Optional[str]
    open_date: Optional[str]
    birth_dates: tuple = ()       # YYYY-MM-DD 후보 전부 (등본은 세대원마다 하나씩)
    account_holder: Optional[str] = None   # 통장 예금주 (공백 제거)
    account_no: Optional[str] = None


# --- 파일 → 이미지 ------------------------------------------------------------

def to_images(data: bytes, ext: str, max_pages: int = MAX_PDF_PAGES) -> list:
    """PaddleOCR 에 넣을 BGR ndarray 목록. 디스크에 쓰지 않는다 (계약서: 파일을 남기지 않음)."""
    try:
        if ext == ".pdf":
            import pymupdf

            images = []
            with pymupdf.open(stream=data, filetype="pdf") as doc:
                for page in list(doc)[:max_pages]:
                    pix = page.get_pixmap(dpi=PDF_DPI, alpha=False)
                    rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                    images.append(np.ascontiguousarray(rgb[:, :, ::-1]))   # RGB → BGR
        else:
            import cv2

            image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
            images = [] if image is None else [image]
    except Exception as e:
        raise FileUnreadableError(str(e)) from e

    if not images:
        raise FileUnreadableError("이미지로 바꿀 페이지가 없습니다")
    return images


def to_poly(p):
    """numpy 배열 · 리스트 어느 쪽이든 [[x, y] x 4] 로 맞춘다"""
    if p is None:
        return None
    try:
        return [[float(x), float(y)] for x, y in p]
    except (TypeError, ValueError):
        return None


def collect_lines(result, page: int) -> list:
    """PaddleOCR 3.x predict 결과 → Line 목록. 좌표(rec_polys)까지 챙긴다"""
    lines = []
    for res in result:
        texts = res.get("rec_texts", [])
        scores = res.get("rec_scores", [1.0] * len(texts))
        polys = res.get("rec_polys")
        if polys is None:
            polys = res.get("dt_polys")
        if polys is None:
            polys = [None] * len(texts)
        for text, score, poly in zip(texts, scores, polys):
            lines.append(Line(page, text, float(score), to_poly(poly)))
    return lines


# --- 문자열 도우미 -----------------------------------------------------------

def head_text(cells, n: int = TITLE_HEAD_CELLS) -> str:
    """첫 페이지 위쪽 n 칸. cells 는 merge_cells 가 (페이지, 위, 왼쪽) 순으로 정렬해 둔다"""
    return "\n".join(c.text for c in [c for c in cells if c.page == 0][:n])


def norm(s: str) -> str:
    """비교용. OCR 이 '사 업 자 등 록 번 호' 처럼 자간을 띄우거나 공백을 먹으므로 공백을 모두 지운다"""
    return re.sub(r"\s+", "", s or "")


def strip_label(raw: str, key: str) -> str:
    """'성명(대 표 자) 이경옥' → '이경옥'.

    병합된 칸에는 라벨과 값이 같이 들어온다. 라벨 비교는 공백을 지운 상태로 하므로
    공백 제거 문자열의 위치를 원문 인덱스로 되짚어 잘라낸다.
    """
    compact, idx = [], []
    for i, ch in enumerate(raw or ""):
        if not ch.isspace():
            compact.append(ch)
            idx.append(i)
    pos = "".join(compact).find(key)
    if pos < 0:
        return ""
    return raw[idx[pos + len(key) - 1] + 1:].strip()


def dates_in(text: str) -> list:
    """텍스트 안의 날짜를 등장 순서대로 YYYY-MM-DD 로. 두 정규식이 같은 날짜를 잡아도 한 번만 넣는다"""
    found = []
    for rx in (DATE_RE, KO_DATE_RE):
        for m in rx.finditer(text or ""):
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1900 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                found.append((m.start(), f"{y}-{mo:02d}-{d:02d}"))
    return list(dict.fromkeys(iso for _, iso in sorted(found)))


def v_brn(s):
    m = BRN_RE.search(s or "")
    return re.sub(r"\D", "", m.group()) if m else None


def v_date(s):
    ds = dates_in(s)
    return ds[0] if ds else None


def v_account(s):
    for m in ACCOUNT_RE.finditer(s or ""):
        if 10 <= len(re.sub(r"\D", "", m.group())) <= 16:
            return re.sub(r"\s+", "", m.group()).replace("–", "-").replace("—", "-")
    return None


def birth_from_id(front: str, back: str) -> Optional[str]:
    """주민등록번호 앞 6자리 → YYYY-MM-DD. 세기는 뒷자리 첫 글자로, 가려져 있으면 두 자리 연도로 짐작한다"""
    yy, mm, dd = int(front[:2]), int(front[2:4]), int(front[4:6])
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None
    g = back[:1]
    if g in "1256":
        century = 1900
    elif g in "3478":
        century = 2000
    elif g in "90":
        century = 1800
    else:
        century = 1900 if yy >= 30 else 2000
    return f"{century + yy}-{mm:02d}-{dd:02d}"


# --- 칸 병합과 라벨 짝짓기 -----------------------------------------------------

def _merge(group):
    """조각 여러 개를 한 칸으로. 텍스트는 공백 하나로 잇고 좌표는 전체를 감싸는 사각형"""
    text = re.sub(r"\s+", " ", " ".join(g.text.strip() for g in group)).strip()
    x0 = min(g.left for g in group)
    x1 = max(g.right for g in group)
    y0 = min(g.top for g in group)
    y1 = max(g.bottom for g in group)
    return Line(group[0].page, text, sum(g.score for g in group) / len(group),
                [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])


def merge_cells(lines, row_tol=ROW_TOL, gap=CELL_GAP):
    """PP-OCR 은 표 칸을 글자 조각으로 쪼개 인식한다('개' / '업' / '일 2005년03월23일').
    같은 행으로 묶고 가로로 가까운 조각끼리 합쳐 '라벨 칸 | 값 칸' 형태로 되돌린다.
    """
    usable = [ln for ln in lines if ln.poly is not None and ln.text.strip()]
    cells = []
    for page in sorted({ln.page for ln in usable}):
        page_lines = sorted((ln for ln in usable if ln.page == page), key=lambda ln: (ln.center_y, ln.left))

        # 1) 세로 중심이 가까우면 같은 행.
        #    행의 '범위' 로 판정하면 조각이 붙을 때마다 띠가 넓어져, 줄 간격이 좁은 저해상도 이미지에서
        #    윗줄·아랫줄이 연쇄로 붙는다. 그래서 행에 들어온 조각들의 중심 y 중앙값과 비교한다
        rows = []
        for ln in page_lines:
            h = max(ln.bottom - ln.top, 1.0)
            for row in rows:
                row_cy = sorted(x.center_y for x in row)[len(row) // 2]
                if abs(ln.center_y - row_cy) <= h * row_tol:
                    row.append(ln)
                    break
            else:
                rows.append([ln])

        # 2) 행 안에서 가로로 가까운 조각끼리 한 칸으로
        for row in rows:
            row.sort(key=lambda ln: ln.left)
            group = [row[0]]
            for cur in row[1:]:
                h = max(max(g.bottom - g.top for g in group), cur.bottom - cur.top, 1.0)
                if cur.left - max(g.right for g in group) <= h * gap:
                    group.append(cur)
                else:
                    cells.append(_merge(group))
                    group = [cur]
            cells.append(_merge(group))

    cells.sort(key=lambda c: (c.page, c.top, c.left))
    return cells


def pair_by_row(cells, label, validator, y_tol=0.6):
    """라벨 칸을 찾아 그 값을 돌려준다. 없으면 None.

      (1) 라벨과 값이 한 칸에 있으면 라벨을 떼고 나머지에서 찾는다
      (2) 아니면 같은 행에서 라벨보다 오른쪽 칸을 왼쪽부터 본다
    검증기를 통과하지 못하면 다음 후보로 넘어가므로 엉뚱한 칸이 걸러진다.
    """
    key = norm(label)
    for c in cells:
        if key not in norm(c.text):
            continue

        tail = strip_label(c.text, key)
        got = validator(tail) if tail else None
        if not got:
            got = validator(c.text)       # 정규식 검증기는 라벨 앞뒤 어디에 값이 있어도 골라낸다
        if got:
            return got

        if c.poly is None:
            continue
        h = max(c.bottom - c.top, 1.0)
        row = [o for o in cells
               if o is not c and o.page == c.page and o.poly is not None
               and c.top - h * y_tol <= o.center_y <= c.bottom + h * y_tol
               and o.left >= c.right - h * 0.5]
        for o in sorted(row, key=lambda x: x.left):
            got = validator(o.text)
            if got:
                return got
    return None


# --- 규칙 추출 --------------------------------------------------------------

def find_brn(cells) -> Optional[str]:
    """사업자등록번호는 라벨 없이 찾는다. 3-2-5 형식은 증명서 한 장에 보통 하나뿐이라 라벨보다 믿을 만하다
    (실측 6장 모두 유일. OCR 이 라벨을 '사업자등복번호' 로 잘못 읽어도 영향이 없다). 여러 개일 때만 라벨로 가린다."""
    found = list(dict.fromkeys(v_brn(m.group()) for c in cells for m in BRN_RE.finditer(c.text)))
    if len(found) == 1:
        return found[0]
    if not found:
        return None
    for label in BRN_LABELS:
        value = pair_by_row(cells, label, v_brn)
        if value:
            return value
    return None


def find_dates(cells):
    """(발급일, 유효기간 끝). '문서 내 가장 늦은 날짜 = 발급일' 은 유효기간·과세기간 때문에 틀린다.

      - '유효기간' 칸의 마지막 날짜 → 유효기간 끝 ('2026-04-01~2027-03-31' 이면 끝 날짜)
      - 날짜가 2개 이상인 칸(표의 기간 행)과 NOT_ISSUE_WORDS 칸은 발급일 후보에서 뺀다
      - 남은 후보 중 발급 문구 근처 > 날짜만 있는 칸 > 나머지, 같으면 늦은 날짜
    """
    valid_until = None
    candidates = []
    for c in cells:
        ds = dates_in(c.text)
        if not ds:
            continue
        n = norm(c.text)
        if "유효기간" in n:
            valid_until = max(valid_until or ds[-1], ds[-1])
            continue
        if len(ds) >= 2 or any(w in n for w in NOT_ISSUE_WORDS):
            continue
        rest = re.sub(r"[\d\s.\-–—년월일]", "", c.text)
        score = 2 if any(h in n for h in ISSUE_HINTS) else (1 if len(rest) <= 3 else 0)
        candidates.append((score, ds[0]))

    issue = max(candidates)[1] if candidates else None
    return issue, valid_until


def find_birth_dates(cells) -> tuple:
    """생년월일 후보. 서류에 적힌 곳이 제각각이라 세 군데를 모두 본다.

      - '생년월일' 라벨 (개인 사업자등록증)
      - '신청인:김표준(1994-03-11)' 처럼 신청인 이름 뒤 괄호 안의 날짜 (주민등록등본)
      - 주민등록번호 앞 6자리 (지방세 납세증명서 · 등본 세대원). 바로 앞에 '법인' 이 있으면 법인등록번호라 뺀다
    """
    found = []
    got = pair_by_row(cells, "생년월일", v_date)
    if got:
        found.append(got)
    for c in cells:
        for m in APPLICANT_BIRTH_RE.finditer(c.text):
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= mo <= 12 and 1 <= d <= 31:
                found.append(f"{y}-{mo:02d}-{d:02d}")
        for m in ID_NUMBER_RE.finditer(c.text):
            if "법인" in norm(c.text[max(0, m.start() - 12):m.start()]):
                continue
            iso = birth_from_id(m.group(1), m.group(2))
            if iso:
                found.append(iso)
    return tuple(dict.fromkeys(found))


def v_holder(s):
    n = re.sub(r"님$", "", norm(s).lstrip(":："))
    if not (2 <= len(n) <= 20) or "예금주" in n or re.search(r"\d", n) or not re.search(r"[가-힣]", n):
        return None
    return n


def find_account_holder(cells) -> Optional[str]:
    """통장 예금주. 인터넷뱅킹 통장사본은 '예금주' 라벨이 있고,
    종이 통장은 라벨 없이 '김 표 준 님' 처럼 이름 뒤에 '님' 만 붙어 있다"""
    # 라벨은 칸 맨 앞에 있을 때만 본다. 안내문 '예금주가 본인의 주민등록증을…' 에서 '가본인의' 를 집지 않게
    for c in cells:
        m = HOLDER_LABEL_RE.match(c.text)
        if not m:
            continue
        got = v_holder(c.text[m.end():])
        if got:
            return got
        if c.poly is None:
            continue
        h = max(c.bottom - c.top, 1.0)
        right = sorted((o for o in cells if o is not c and o.page == c.page and o.poly is not None
                        and c.top - h * 0.6 <= o.center_y <= c.bottom + h * 0.6 and o.left >= c.right - h * 0.5),
                       key=lambda o: o.left)
        if right and v_holder(right[0].text):
            return v_holder(right[0].text)
    for c in cells:
        n = norm(c.text)
        if n.endswith("님") and 2 <= len(n) - 1 <= 30 and not any(w in n for w in NOT_HOLDER_WORDS):
            return n[:-1]
    return None


def extract_rule_fields(cells) -> RuleFields:
    issue_date, valid_until = find_dates(cells)
    open_date = None
    for label in OPEN_DATE_LABELS:
        open_date = pair_by_row(cells, label, v_date)
        if open_date:
            break
    return RuleFields(find_brn(cells), issue_date, valid_until, open_date,
                      birth_dates=find_birth_dates(cells),
                      account_holder=find_account_holder(cells),
                      account_no=pair_by_row(cells, "계좌번호", v_account))
