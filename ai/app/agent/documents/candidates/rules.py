"""구조 heuristic 정책. 도메인 라벨명/SourceKey 매핑을 두지 않는다."""

import re

from ..parser.models import ParsedTable, ParsedTableCell
from .enums import CandidateRelation as Relation, FieldInputShape as Shape
from .normalizer import normalize_label

UNITS = frozenset({"원", "천원", "만원", "백만원", "명", "%", "개월", "년", "월", "일", "건", "회"})
UNIT_SUFFIXES = UNITS - {"년", "월", "일"}
MAX_LABEL_LENGTH = 60       # 공백 제거 후
MAX_LABEL_RAW_LENGTH = 120
MAX_LABEL_LINES = 3
MAX_CONTEXT_ITEM_LENGTH = 80
MAX_CONTEXT_LENGTH = 300
MAX_CONTEXT_ITEMS = 6
LONG_COLUMN_SPAN = 4
LONG_ROW_SPAN = 2
MAX_FORWARD_SCAN_CELLS = 3  # 보조 셀과 최종 target을 합한 상한
SCAN_PENALTY = 0.10
INSTRUCTION_PENALTY = 0.15
LAYOUT_MARKERS = frozenset({":", "：", "|", "│"})
FORM_MARKER_PATTERNS = tuple(re.compile(pattern) for pattern in (
    r"(?:서식|붙임)\s*\d+",
    r"\[\s*별지\s*제?\s*\d+\s*호\s*서식\s*\]",
))
HELPER_PATTERNS = tuple(re.compile(pattern) for pattern in (
    r"\(\s*사업자등록증\s*상\s*\)",
    r"\(\s*해당자만\s*작성\s*\)",
    r"\(\s*해당\s*시\s*작성\s*\)",
    r"\(\s*\d{4}\s*년\s*\)",
    r"(?:\d+|[OoＯ○〇]{1,3})\s*자\s*이내",
    r".{1,30}\s+기준",
))
DATE_PLACEHOLDER_PATTERNS = (
    re.compile(r"(?:[_＿.·\s]*|YYYY|\d{4}\s*)년(?:[_＿.·\s]*|MM)월(?:[_＿.·\s]*|DD)일", re.I),
)
BRACKET_PLACEHOLDER = re.compile(r"(?:\([\s_＿.·…]*\)|\[[\s_＿.·…]*\])")
CHECKBOX = re.compile(r"[□☐▢]")
BLANK_MARKS = re.compile(r"[_＿.·…\s]{2,}")
MAX_PLACEHOLDER_LENGTH = 120
CONFIDENCE = {
    (Relation.RIGHT, "empty"): 0.95,
    (Relation.RIGHT, "unit_suffix"): 0.85,
    (Relation.RIGHT, "helper"): 0.80,
    (Relation.RIGHT, "placeholder"): 0.78,
    (Relation.BELOW, "empty"): 0.70,
    (Relation.BELOW, "empty_long"): 0.75,
    (Relation.BELOW, "helper"): 0.65,
    (Relation.BELOW, "placeholder"): 0.60,
}
RELATION_PRIORITY = {Relation.RIGHT: 3, Relation.BELOW: 2, Relation.SAME_CELL: 1}


def nested_tables(cell: ParsedTableCell):
    return [block for block in cell.blocks if isinstance(block, ParsedTable)]


def has_objects(cell: ParsedTableCell) -> bool:
    return cell.has_non_text_content or any(p.has_non_text_content for p in cell.paragraphs)


def valid_geometry(cell: ParsedTableCell) -> bool:
    return cell.row_index >= 0 and cell.column_index >= 0 and cell.row_span > 0 and cell.column_span > 0


def unit(text: str) -> str | None:
    normalized = normalize_label(text)
    if normalized.startswith("(") and normalized.endswith(")"):
        normalized = normalized[1:-1]
    return normalized if normalized in UNITS else None


def unit_suffix(text: str) -> str | None:
    value = unit(text)
    return value if value in UNIT_SUFFIXES else None


def linked_unit(target, cells) -> str | None:
    """Context와 무관하게 target 자체 또는 직접 오른쪽 suffix만 연결한다."""
    if value := unit_suffix(target.text):
        return value
    suffixes = [c for c in cells if valid_geometry(c) and not has_objects(c)
                and not nested_tables(c) and right_of(target, c) and unit(c.text)]
    # 병합 경계에 여러 suffix가 닿으면 하나를 임의 선택하지 않는다.
    return unit(suffixes[0].text) if len(suffixes) == 1 else None


def helper(text: str) -> bool:
    return any(pattern.fullmatch(text.strip()) for pattern in HELPER_PATTERNS)


def date_placeholder(text: str) -> bool:
    return any(pattern.fullmatch(text.strip()) for pattern in DATE_PLACEHOLDER_PATTERNS)


def placeholder_parts(text: str) -> tuple[str, str] | None:
    """모든 비어 있지 않은 줄이 placeholder/helper인 경우에만 복합 셀 허용."""
    if len(text) > MAX_PLACEHOLDER_LENGTH:
        return None
    # 날짜 내부 줄바꿈도 공백으로 취급한다.
    if date_placeholder(text):
        return text.strip(), ""
    values, helpers = [], []
    for line in (line.strip() for line in text.splitlines() if line.strip()):
        if helper(line):
            helpers.append(line)
        elif (date_placeholder(line) or CHECKBOX.search(line)
              or BLANK_MARKS.fullmatch(line) or BRACKET_PLACEHOLDER.fullmatch(line)):
            values.append(line)
        else:
            return None
    return ("\n".join(values), "\n".join(helpers)) if values else None


def placeholder(text: str) -> bool:
    return placeholder_parts(text) is not None


def form_marker(text: str) -> bool:
    return any(pattern.fullmatch(text.strip()) for pattern in FORM_MARKER_PATTERNS)


def likely_instruction(text: str) -> bool:
    return text.lstrip().startswith("※") or (len(text.strip()) >= 40 and text.rstrip().endswith("."))


def forward_target(label, cells):
    """인접한 구분 기호만 건너뛴다. 빈 셀/helper/placeholder는 첫 target이다."""
    cursor = label.column_index + label.column_span
    for step in range(1, MAX_FORWARD_SCAN_CELLS + 1):
        frontier = [c for c in cells if row_overlap(label, c)
                    and c.column_index == cursor]
        # 분기하는 병합 구조에서는 경로를 임의 선택하지 않는다.
        if len(frontier) != 1:
            return None
        current = frontier[0]
        if not valid_geometry(current) or has_objects(current) or nested_tables(current):
            return None
        kind = target_kind(current)
        if kind:
            return current, kind, step
        if current.text.strip() not in LAYOUT_MARKERS:
            return None  # 새 label, unit, 작성 값, 알 수 없는 텍스트 모두 경계
        cursor += current.column_span
    return None


def target_kind(cell: ParsedTableCell) -> str | None:
    if not valid_geometry(cell) or has_objects(cell) or nested_tables(cell):
        return None
    if unit_suffix(cell.text):
        return "unit_suffix"
    if cell.is_empty and not cell.text.strip():
        return "empty"
    if helper(cell.text):
        return "helper"
    if placeholder(cell.text):
        return "placeholder"
    return None


def is_label(cell: ParsedTableCell) -> bool:
    text = cell.text
    compact = normalize_label(text)
    return bool(
        valid_geometry(cell) and not has_objects(cell) and not nested_tables(cell)
        and compact and any(c.isalnum() for c in compact) and not unit(text)
        and not helper(text) and not placeholder(text) and not form_marker(text)
        and len(compact) <= MAX_LABEL_LENGTH and len(text) <= MAX_LABEL_RAW_LENGTH
        and len(text.strip().splitlines()) <= MAX_LABEL_LINES
    )


def overlaps(a_start, a_span, b_start, b_span):
    return max(a_start, b_start) < min(a_start + a_span, b_start + b_span)


def row_overlap(a, b):
    return overlaps(a.row_index, a.row_span, b.row_index, b.row_span)


def column_overlap(a, b):
    return overlaps(a.column_index, a.column_span, b.column_index, b.column_span)


def right_of(label, target):
    return label.column_index + label.column_span == target.column_index and row_overlap(label, target)


def below(label, target):
    return label.row_index + label.row_span == target.row_index and column_overlap(label, target)


def adjacent(a, b):
    return right_of(a, b) or right_of(b, a) or below(a, b) or below(b, a)


def input_shape(target, relation=None, cells=()):
    text = target.text.strip()
    parts = placeholder_parts(text)
    if parts and date_placeholder(parts[0]):
        return Shape.DATE
    if CHECKBOX.search(text):
        return Shape.CHECKBOX
    if unit_suffix(text):
        return Shape.NUMBER
    has_unit = any(unit(c.text) and adjacent(target, c) for c in cells)
    # 가로 병합만으로 일반 RIGHT 입력을 장문으로 만들지 않는다.
    if not has_unit and (target.row_span >= LONG_ROW_SPAN or (
            relation == Relation.BELOW and target.column_span >= LONG_COLUMN_SPAN)):
        return Shape.LONG_TEXT
    if target.is_empty and not text:
        return Shape.SHORT_TEXT
    return Shape.UNKNOWN


def confidence(relation, kind, shape):
    category = "empty_long" if relation == Relation.BELOW and kind == "empty" and shape == Shape.LONG_TEXT else kind
    return CONFIDENCE[(relation, category)]

