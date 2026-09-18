"""PP-OCRv5(한국어) 실측: 인식 품질 · 장당 시간 · 규칙/GMS 필드 추출 · 정답 대조

사용법:
    python scripts/check_ocr.py                 # data/raw/ocr/ 안의 파일 전부
    python scripts/check_ocr.py 경로.pdf 경로.jpg
    OCR_CACHE=0 ...   # 인식 결과 캐시를 무시하고 다시 OCR
    OCR_GMS=0 ...     # GMS 호출 없이 규칙 추출만

준비:
    pip install paddleocr paddlepaddle pymupdf psutil openai python-dotenv
    (pymupdf 는 PDF 를 이미지로 바꿀 때만 필요)
"""
import json, os, re, sys, time
from pathlib import Path
from typing import NamedTuple, Optional

ROOT = Path(__file__).resolve().parents[1]
# 모델 캐시를 ai/models 로 (gitignore 됨). 배포에서는 /models 볼륨을 쓴다
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(ROOT / "models" / "paddlex"))

import psutil

SAMPLE_DIR = ROOT / "data" / "raw" / "ocr"
PDF_DPI = int(os.getenv("OCR_PDF_DPI", "200"))  # 스캔 문서 기준. 낮으면 작은 글씨를 놓친다
PREVIEW_LINES = int(os.getenv("OCR_PREVIEW", "15"))   # 출력할 칸 수 (0 이면 전부)
MKLDNN = os.getenv("OCR_MKLDNN", "0") == "1"   # oneDNN 가속. 3.3.0 버그로 기본 끔
MAX_SIDE = int(os.getenv("OCR_MAX_SIDE", "0"))  # 긴 변을 이 크기로 축소 (0이면 원본). 속도 비교용
# lang="korean" 은 검출(det)에 무거운 server 모델을 쓴다 → 느리다. 그래서 det 를 mobile 로 지정하는데,
# ⚠ 모델 이름을 하나라도 지정하면 lang 이 통째로 무시된다 ("lang will be ignored when model names ...").
#    rec 를 같이 지정하지 않으면 한국어 모델이 아닌 기본 rec 가 붙어 인식이 깨진다 (신뢰도 0.918 → 0.550)
DET_MODEL = os.getenv("OCR_DET", "PP-OCRv5_mobile_det")
REC_MODEL = os.getenv("OCR_REC", "korean_PP-OCRv5_mobile_rec")
# 같은 칸으로 합칠 가로 간격 (글자 높이 배수). 크게 잡는 편이 안전하다 —
# 라벨과 값이 한 칸으로 붙어도 strip_label 이 떼어내지만, 덜 합치면 '개 업 일' 처럼 라벨이 쪼개져 매칭을 놓친다.
# 실측: 자간 넓은 3글자 라벨은 2.4배, 다른 열(공동사업자 표)은 5배 → 그 사이인 4.0
CELL_GAP = float(os.getenv("OCR_CELL_GAP", "4.0"))
ROW_TOL = float(os.getenv("OCR_ROW_TOL", "0.6"))    # 같은 행으로 볼 세로 허용치

# 사업자등록번호. 하이픈을 '반드시' 요구해야 주민(법인)등록번호(254321-0007034)나
# 접수번호(502998232834) 가 섞여 들어오지 않는다
BRN_RE = re.compile(r"(?<!\d)\d{3}\s*-\s*\d{2}\s*-\s*\d{5}(?!\d)")
# '2005년 03월 23일' / '2022 년 7 월 25 일' / '2005.03.23' / '2005-03-23'
# OCR 이 하이픈을 en dash(–) 로 읽는 경우가 있다 ('2021-04–01')
DATE_RE = re.compile(r"(\d{4})\s*[.\-–—년]\s*(\d{1,2})\s*[.\-–—월]\s*(\d{1,2})")
# '2026년 Year 09월 17일' 처럼 영문 병기 양식은 년·월 뒤에 글자가 끼어든다
KO_DATE_RE = re.compile(r"(\d{4})\s*년[^\d]{0,8}?(\d{1,2})\s*월[^\d]{0,8}?(\d{1,2})\s*일")
# 주민·법인등록번호. GMS 로 보내기 전에 가린다
RRN_RE = re.compile(r"(?<!\d)\d{6}\s*-\s*[\d*]{7}(?!\d)")

CACHE = os.getenv("OCR_CACHE", "1") == "1"      # 인식 결과를 저장해 두고 재사용 (규칙만 고칠 때)
GMS_ON = os.getenv("OCR_GMS", "1") == "1"       # 대표자·상호·주소를 GMS 텍스트 파서로 추출
GMS_MODEL = os.getenv("OCR_GMS_MODEL", "gpt-4.1-mini")

# 문서에 값이 잡히는지 보기 위한 러프 패턴 (필드 추출과 달리 라벨을 안 본다)
PATTERNS = {
    "사업자번호": r"\d{3}\s*-?\s*\d{2}\s*-?\s*\d{5}",
    "날짜": r"\d{4}\s*[.\-년]\s*\d{1,2}\s*[.\-월]\s*\d{1,2}",
    "금액": r"[\d,]{4,}\s*원",
}


class Line(NamedTuple):
    """OCR 이 인식한 한 줄. poly 는 [[x, y] x 4], 좌표를 못 받으면 None"""
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


def norm(s: str) -> str:
    """라벨 비교용. OCR 이 '사 업 자 등 록 번 호' 처럼 자간을 띄워 뱉으므로 공백을 모두 지운다"""
    return re.sub(r"\s+", "", s or "")


def strip_label(raw: str, key: str) -> str:
    """'성명(대 표 자) 이경옥' → '이경옥'.

    병합된 칸에는 라벨과 값이 같이 들어오는 경우가 많다. 라벨 비교는 공백을 지운 상태로 하므로
    원문에서 바로 자를 수 없어, 공백 제거 문자열의 위치를 원문 인덱스로 되짚어 잘라낸다.
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


def to_iso(s: str) -> Optional[str]:
    """'2005년 03월 23일' → '2005-03-23'. 없으면 None"""
    m = DATE_RE.search(s or "")
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else None


# --- 값 검증기 ------------------------------------------------------------
# 라벨 옆 칸에서 주운 텍스트가 '그 필드의 값이 맞는지' 확인한다.
# 검증에 실패하면 다음 후보 칸으로 넘어가므로 오매칭이 자동으로 걸러진다.

def v_brn(s):
    m = BRN_RE.search(s or "")
    return re.sub(r"\s", "", m.group()) if m else None


def v_date(s):
    return to_iso(s)


# 값 칸에 라벨이 잡힌 경우를 걸러낸다 (공동사업자 표 헤더 '주민(사업자)등록번호' 같은 것)
LABEL_WORDS = ("등록번호", "성명", "상호", "법인명", "소재지", "개업", "업태", "종목", "처리기간")


def v_text(s):
    s = re.sub(r"\s+", " ", (s or "")).strip()
    if len(s) < 2 or any(w in norm(s) for w in LABEL_WORDS):
        return None
    return s


# 정규식 검증기는 '라벨과 값이 한 줄로 인식된' 경우에도 값만 골라낼 수 있다.
# v_text 는 그러면 라벨 자신을 값으로 돌려주므로 제외한다.
INLINE_SAFE = {v_brn, v_date}

# 라벨 후보는 '구체적인 것부터'. 첫 번째로 검증을 통과한 값이 나오는 라벨을 쓴다.
#   예) '등록번호' 를 먼저 보면 주민(법인)등록번호를 집을 수 있으므로 뒤에 둔다
FIELD_LABELS = {
    "brn":           (["사업자등록번호", "등록번호"],       v_brn),
    "owner_name":    (["성명(대표자)", "대표자", "성명"],   v_text),
    "business_name": (["상호(법인명)", "상호", "법인명"],   v_text),
    "address":       (["사업장소재지", "사업장", "소재지"], v_text),
    "open_date":     (["개업일", "개업연월일", "개업"],     v_date),   # OCR 이 '일' 을 놓치는 경우 대비. v_date 가 날짜만 통과시킨다
}


def to_poly(p):
    """numpy 배열 · 리스트 어느 쪽이든 [[x, y] x 4] 로 맞춘다"""
    if p is None:
        return None
    try:
        return [[float(x), float(y)] for x, y in p]
    except Exception:
        return None


def collect_lines(result, page: int) -> list:
    """paddleocr 버전마다 결과 형태가 달라 둘 다 받아준다. 좌표(poly)까지 챙긴다"""
    lines = []
    for res in result:
        # 3.x: dict (rec_texts / rec_scores / rec_polys)
        if isinstance(res, dict):
            texts = res.get("rec_texts", [])
            scores = res.get("rec_scores", [1.0] * len(texts))
            polys = res.get("rec_polys")
            if polys is None:
                polys = res.get("dt_polys")
            if polys is None:
                polys = [None] * len(texts)
            for t, s, p in zip(texts, scores, polys):
                lines.append(Line(page, t, float(s), to_poly(p)))
            continue
        # 2.x: [ [box, (text, score)], ... ]
        for item in res or []:
            if isinstance(item, (list, tuple)) and len(item) >= 2 and isinstance(item[1], (list, tuple)):
                lines.append(Line(page, item[1][0], float(item[1][1]), to_poly(item[0])))
    return lines


def to_images(path: Path) -> list:
    """PDF 는 페이지별 이미지로, 이미지 파일은 그대로."""
    if path.suffix.lower() != ".pdf":
        return [str(path)]

    import pymupdf

    out_dir = ROOT / "models" / "_ocr_tmp"
    out_dir.mkdir(parents=True, exist_ok=True)
    images = []
    with pymupdf.open(path) as doc:
        for i, page in enumerate(doc):
            out = out_dir / f"{path.stem}_{i}.png"
            page.get_pixmap(dpi=PDF_DPI).save(out)
            images.append(str(out))
    return images


def shrink(img_path: str) -> str:
    """긴 변을 MAX_SIDE 로 축소. 해상도가 속도·정확도에 얼마나 영향을 주는지 보기 위함."""
    if not MAX_SIDE:
        return img_path

    from PIL import Image

    out = Path(img_path).with_name(Path(img_path).stem + f"_{MAX_SIDE}.png")
    with Image.open(img_path) as im:
        if max(im.size) <= MAX_SIDE:
            return img_path
        ratio = MAX_SIDE / max(im.size)
        im.resize((int(im.width * ratio), int(im.height * ratio))).save(out)
    return str(out)


def predict(ocr, img: str):
    """paddleocr 3.x 는 predict, 2.x 는 ocr."""
    return ocr.predict(img) if hasattr(ocr, "predict") else ocr.ocr(img)


def _merge(group):
    """조각 여러 개를 한 칸으로. 텍스트는 공백 하나로 잇고 좌표는 전체를 감싸는 사각형"""
    text = re.sub(r"\s+", " ", " ".join(g.text.strip() for g in group)).strip()
    x0 = min(g.left for g in group); x1 = max(g.right for g in group)
    y0 = min(g.top for g in group);  y1 = max(g.bottom for g in group)
    return Line(group[0].page, text,
                sum(g.score for g in group) / len(group),
                [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])


def merge_cells(lines, row_tol=None, gap=None):
    """PP-OCR 은 표 칸을 글자 조각으로 쪼개 인식한다 ('발' / '급' / '번호').

    자간이 넓은 라벨이나 긴 주소가 여러 박스로 갈라지므로, 짝짓기 전에
    같은 행으로 묶고 가로로 가까운 조각끼리 합쳐 '라벨 칸 | 값 칸' 형태로 되돌린다.
    """
    row_tol = ROW_TOL if row_tol is None else row_tol
    gap = CELL_GAP if gap is None else gap

    usable = [ln for ln in lines if ln.poly is not None and ln.text.strip()]
    if not usable:
        return [ln for ln in lines if ln.text.strip()]

    cells = []
    for page in sorted({ln.page for ln in usable}):
        page_lines = sorted((l for l in usable if l.page == page),
                            key=lambda l: (l.center_y, l.left))

        # 1) 세로 중심이 가까우면 같은 행
        #    행의 '범위' 로 판정하면 조각이 붙을 때마다 띠가 넓어져, 줄 간격이 좁은 저해상도 이미지에서
        #    윗줄·아랫줄이 연쇄로 붙는다 (829×1046 사업자등록증명: 개업일 행 + 사업자등록일 행이 한 칸이 됨).
        #    그래서 행에 이미 들어온 조각들의 중심 y 중앙값과 비교한다
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
            row.sort(key=lambda l: l.left)
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
    """라벨 칸을 찾아 그 '값' 을 돌려준다. (값, 실제로 쓴 라벨, 원본 칸)

    증명서류는 대부분 표라서 라벨이 왼쪽 칸, 값이 오른쪽 칸에 있고 y 좌표가 겹친다.
      (1) 라벨과 값이 한 칸으로 합쳐진 경우 → 그 칸에서 바로 뽑는다 (정규식 검증기에만 허용)
      (2) 같은 행에서 라벨보다 오른쪽에 있는 칸을 왼쪽부터 본다
    검증기를 통과하지 못하면 다음 후보로 넘어간다.
    """
    key = norm(label)
    for c in cells:
        if key not in norm(c.text):
            continue

        # (1) 한 칸에 라벨 + 값이 같이 들어온 경우 → 라벨을 떼고 나머지를 값으로 본다
        tail = strip_label(c.text, key)
        got = validator(tail) if tail else None
        # 정규식 검증기는 라벨 앞/뒤 어디에 값이 있어도 골라낼 수 있다
        if not got and validator in INLINE_SAFE:
            got = validator(c.text)
        if got:
            return got, label, c.text

        if c.poly is None:
            continue

        # (2) 같은 행의 오른쪽 칸들
        h = max(c.bottom - c.top, 1.0)
        row = [o for o in cells
               if o is not c and o.page == c.page and o.poly is not None
               and c.top - h * y_tol <= o.center_y <= c.bottom + h * y_tol
               and o.left >= c.right - h * 0.5]
        for o in sorted(row, key=lambda x: x.left):
            got = validator(o.text)
            if got:
                return got, label, o.text
    return None, None, None


# --- 규칙 추출: 형식이 뚜렷한 값 (사업자번호 · 날짜) --------------------------

def dates_in(text: str) -> list:
    """텍스트 안의 날짜를 등장 순서대로 ISO 로. 두 정규식이 같은 날짜를 잡아도 한 번만 넣는다"""
    found = []
    for rx in (DATE_RE, KO_DATE_RE):
        for m in rx.finditer(text or ""):
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1900 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                found.append((m.start(), f"{y}-{mo:02d}-{d:02d}"))
    return list(dict.fromkeys(iso for _, iso in sorted(found)))


def find_brn(cells):
    """사업자등록번호는 라벨 없이 찾는다.

    하이픈 3-2-5 형식은 증명서 한 장에 보통 하나뿐이라 라벨보다 믿을 만하다.
    (실측 5종 모두 유일. OCR 이 라벨을 '사업자등복번호' 로 잘못 읽어도 영향이 없다)
    여러 개가 나오면 그때만 라벨로 가린다.
    """
    found = list(dict.fromkeys(re.sub(r"\s", "", m.group())
                               for c in cells for m in BRN_RE.finditer(c.text)))
    if len(found) == 1:
        return found[0], "문서 내 유일한 3-2-5 번호"
    if not found:
        return None, "3-2-5 형식 번호 없음"
    for label in FIELD_LABELS["brn"][0]:
        value, used, _ = pair_by_row(cells, label, v_brn)
        if value:
            return value, f"후보 {found} 중 '{used}' 라벨로 선택"
    return None, f"후보 {found} — 라벨로도 못 가림"


# 발급일 후보에서 뺄 칸: 발급일이 아닌 날짜가 적힌 곳
NOT_ISSUE_WORDS = ("유효기간", "개업", "등록일", "과세기간", "이주확인일")
# 발급일이 찍히는 자리 근처에 나오는 말
ISSUE_HINTS = ("증명합니다", "확인합니다", "세무서장", "장관", "발급일")


def find_dates(cells):
    """발급일과 유효기간 끝을 찾는다. ((issue, 근거), (valid_until, 근거))

    '문서 내 가장 늦은 날짜 = 발급일' 은 첫 샘플에서만 맞았다.
    유효기간(납세증명서·소상공인확인서)이나 과세기간(부가세)이 발급일보다 늦을 수 있기 때문.
      - '유효기간' 칸의 마지막 날짜 → valid_until  ('2026-04-01~2027-03-31' 이면 끝 날짜)
      - 날짜가 2개 이상인 칸(표의 기간 행)과 NOT_ISSUE_WORDS 칸은 발급일 후보에서 뺀다
      - 남은 후보 중 ISSUE_HINTS 근처 > 날짜만 있는 칸 > 나머지 순, 같으면 늦은 날짜
    """
    valid_until = None
    candidates = []
    for c in cells:
        ds = dates_in(c.text)
        if not ds:
            continue
        n = norm(c.text)
        if "유효기간" in n:
            valid_until = max([valid_until, ds[-1]] if valid_until else [ds[-1]])
            continue
        if len(ds) >= 2 or any(w in n for w in NOT_ISSUE_WORDS):
            continue
        rest = re.sub(r"[\d\s.\-–—년월일]", "", c.text)
        score = 2 if any(h in n for h in ISSUE_HINTS) else (1 if len(rest) <= 3 else 0)
        candidates.append((score, ds[0], c.text.strip()))

    if candidates:
        score, iso, raw = max(candidates, key=lambda x: (x[0], x[1]))
        why = {2: "발급 문구 근처", 1: "날짜만 있는 칸", 0: "기타 칸"}[score]
        issue = (iso, f"{why}: '{raw[:40]}'")
    else:
        issue = (None, "후보 없음")
    return issue, (valid_until, "'유효기간' 칸" if valid_until else "유효기간 없음")


# --- GMS 텍스트 파서: 양식마다 라벨이 다른 값 (대표자 · 상호 · 주소) ------------

GMS_FIELDS = ("doc_title", "issuer", "owner_name", "business_name", "address")

GMS_PROMPT = """너는 한국 증명서류의 OCR 결과에서 값을 옮겨 적는 도구다.
입력은 OCR 이 인식한 줄들이다. 표의 한 행이 한 줄로 합쳐져 라벨·값·영문 번역이 섞여 있을 수 있고,
글자 사이 공백이 사라지거나 오타가 있을 수 있다.

규칙
- 문서에 적힌 값만 옮겨 적는다. 추측하거나 오타를 고치거나 요약하지 않는다.
- 라벨 글자(예: "상호(법인명)", "Name of company", "대표자명:")는 값에 넣지 않는다.
- 해당 값이 문서에 없으면 null.
- JSON 객체 하나만 출력한다.

필드
- doc_title: 문서 제목 (예: "사업자등록증명", "납세증명서")
- issuer: 문서 끝의 발급자 명의(직인 옆 "OO세무서장", "OO부 장관")에서 직함(장, 장관)을 뺀 기관 이름 (예: "영등포세무서", "중소벤처기업부"). 머리글·로고·안내문에 나오는 "국세청", "정부24" 는 발급 기관이 아니다
- owner_name: 대표자 개인 이름. 법인 서류처럼 성명 칸에 회사명만 있으면 null
- business_name: 상호·법인명·기업명
- address: 사업장 주소"""

_gms = None


def gms_extract(cells):
    """OCR 칸 텍스트를 GMS 에 넘겨 필드를 뽑는다. (dict, 초, 토큰 수)

    GMS 비전은 이미지를 받을 수 있지만 원본 이미지가 외부로 나가고 마스킹을 통제할 수 없어 쓰지 않는다.
    OCR 텍스트만 보내고, 주민·법인등록번호는 가려서 보낸다.
    """
    global _gms
    if _gms is None:
        from dotenv import load_dotenv
        from openai import OpenAI
        load_dotenv(ROOT.parent / ".env")
        _gms = OpenAI(api_key=os.getenv("GMS_API_KEY"),
                      base_url=os.getenv("GMS_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1"),
                      timeout=60.0)

    text = "\n".join(RRN_RE.sub("******-*******", c.text) for c in cells)
    t = time.time()
    res = _gms.chat.completions.create(
        model=GMS_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": GMS_PROMPT},
                  {"role": "user", "content": text}],
    )
    data = json.loads(res.choices[0].message.content or "{}")
    tokens = res.usage.total_tokens if res.usage else 0
    return {k: data.get(k) for k in GMS_FIELDS}, time.time() - t, tokens


# --- 정답 대조 · 캐시 -------------------------------------------------------

EXPECTED_FILE = SAMPLE_DIR / "expected.json"   # gitignore 대상 (실명 포함)


def judge(field, got, want):
    """✅ 일치 / 🔸 주소 앞 9자만 일치 / ❌ 불일치 / · 정답 없음"""
    if want is None and got is None:
        return "✅"
    if want is None or got is None:
        return "❌"
    g, w = norm(str(got)), norm(str(want))
    if g == w:
        return "✅"
    if field in ("doc_title", "issuer") and (g in w or w in g):
        return "✅"
    if field == "address" and g[:9] == w[:9]:
        return "🔸"
    return "❌"


def cache_path(path: Path) -> Path:
    key = f"{PDF_DPI}_{MAX_SIDE}_{DET_MODEL}_{REC_MODEL}"
    return ROOT / "models" / "_ocr_tmp" / f"{path.stem}.{key}.lines.json"


_ocr = None


def get_ocr(proc, mem0):
    """캐시로 전부 처리되면 모델을 아예 올리지 않도록 처음 필요할 때 로드한다"""
    global _ocr
    if _ocr is not None:
        return _ocr
    from paddleocr import PaddleOCR

    t = time.time()
    # enable_mkldnn: PaddlePaddle 3.3.0 의 oneDNN 회귀(PIR 변환 실패)로 기본 끔.
    #   Paddle #77340 / PaddleOCR #15782. 속도 비교하려면 OCR_MKLDNN=1
    kwargs = dict(lang="korean", enable_mkldnn=MKLDNN,
                  use_doc_orientation_classify=False,
                  use_doc_unwarping=False, use_textline_orientation=False)
    if DET_MODEL:
        # det 만 지정하면 lang 이 무시되어 rec 가 한국어 모델에서 벗어난다. 반드시 같이 지정한다
        kwargs["text_detection_model_name"] = DET_MODEL
        kwargs["text_recognition_model_name"] = REC_MODEL
    try:
        _ocr = PaddleOCR(**kwargs)
    except (TypeError, ValueError) as e:   # 버전에 따라 인자명이 없을 수 있다
        print(f"  (모델 지정 실패, 기본값 사용: {e})")
        kwargs.pop("text_detection_model_name", None)
        kwargs.pop("text_recognition_model_name", None)
        _ocr = PaddleOCR(**kwargs)
    print(f"[모델 로드] {time.time()-t:.1f}s, 메모리 +{proc.memory_info().rss/1e9-mem0:.2f}GB")
    return _ocr


def recognize(path: Path, proc, mem0):
    """파일 → Line 목록. 캐시가 있으면 OCR 을 건너뛴다"""
    cp = cache_path(path)
    if CACHE and cp.exists():
        rows = json.loads(cp.read_text(encoding="utf-8"))
        print(f"  [캐시] {len(rows)}줄 ({cp.name})")
        return [Line(*r) for r in rows]

    ocr = get_ocr(proc, mem0)
    all_lines = []
    for page_idx, img in enumerate(to_images(path)):
        img = shrink(img)
        # 1차에는 워밍업이 섞인다. 실제 운영 속도는 2차 값으로 본다
        t = time.time(); predict(ocr, img); first = time.time() - t
        t = time.time(); result = predict(ocr, img); second = time.time() - t
        lines = collect_lines(result, page_idx)
        all_lines += lines
        print(f"  [{Path(img).name}] 1차 {first:.1f}s / 2차 {second:.1f}s, {len(lines)}줄, "
              f"메모리 {proc.memory_info().rss/1e9:.2f}GB")

    cp.parent.mkdir(parents=True, exist_ok=True)
    cp.write_text(json.dumps([list(l) for l in all_lines], ensure_ascii=False), encoding="utf-8")
    return all_lines


def main():
    targets = [Path(a) for a in sys.argv[1:]]
    if not targets:
        exts = {".pdf", ".jpg", ".jpeg", ".png"}
        targets = sorted(p for p in SAMPLE_DIR.glob("*") if p.suffix.lower() in exts) if SAMPLE_DIR.exists() else []
    if not targets:
        print(f"검사할 파일이 없습니다. {SAMPLE_DIR} 에 서류 샘플을 넣거나 경로를 인자로 주세요.")
        return

    expected = json.loads(EXPECTED_FILE.read_text(encoding="utf-8")) if EXPECTED_FILE.exists() else {}
    proc = psutil.Process()
    mem0 = proc.memory_info().rss / 1e9
    score = {"✅": 0, "🔸": 0, "❌": 0}

    for path in targets:
        if not path.exists():
            print(f"\n=== {path.name} — 파일 없음")
            continue
        print(f"\n=== {path.name} ({path.stat().st_size/1024:.0f}KB)")
        try:
            lines = recognize(path, proc, mem0)
        except Exception as e:
            print(f"  인식 실패: {type(e).__name__} {e}")
            continue
        if not lines:
            continue

        scores = [ln.score for ln in lines]
        cells = merge_cells(lines)
        print(f"  평균 신뢰도 {sum(scores)/len(scores):.3f}, {len(lines)}조각 → {len(cells)}칸")

        got, why = {}, {}
        got["brn"], why["brn"] = find_brn(cells)
        (got["issue_date"], why["issue_date"]), (got["valid_until"], why["valid_until"]) = find_dates(cells)
        got["open_date"], why["open_date"] = None, "없음"
        for label in FIELD_LABELS["open_date"][0]:
            v, used, _ = pair_by_row(cells, label, v_date)
            if v:
                got["open_date"], why["open_date"] = v, f"'{used}' 라벨"
                break

        if GMS_ON:
            try:
                data, sec, tokens = gms_extract(cells)
                for k in GMS_FIELDS:
                    got[k], why[k] = data.get(k), f"GMS {sec:.1f}s·{tokens}tok"
            except Exception as e:
                print(f"  ⚠ GMS 호출 실패: {type(e).__name__} {e}")

        want = expected.get(path.stem, {})
        print("  [추출 결과]  (정답은 expected.json)")
        for k in ("doc_title", "issuer", "brn", "owner_name", "business_name",
                  "address", "issue_date", "valid_until", "open_date"):
            if k not in got:
                continue
            mark = judge(k, got[k], want.get(k)) if k in want else "·"
            if mark in score:
                score[mark] += 1
            line = f"    {mark} {k:<13} {str(got[k]) if got[k] is not None else '—':<34} ({why[k]})"
            if mark in ("❌", "🔸"):
                line += f"\n{'':<20}정답: {want.get(k)}"
            print(line)

        if PREVIEW_LINES:
            print(f"  [병합된 칸 상위 {PREVIEW_LINES}개]")
            for c in cells[:PREVIEW_LINES]:
                print(f"    {c.score:.2f}  {c.text[:90]}")

    total = sum(score.values())
    if total:
        print(f"\n=== 합계 ✅ {score['✅']} / 🔸 {score['🔸']} / ❌ {score['❌']}  (대조 {total}개)")


if __name__ == "__main__":
    main()
