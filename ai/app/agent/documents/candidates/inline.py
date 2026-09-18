"""Conservative structural form detection; no label dictionary or Source mapping."""
import re

from ..parser.models import ParsedParagraph, ParsedTable
from ..parser.enums import LocationType
from .models import FieldCandidate
from .normalizer import normalize_label


LABEL_BLANK = re.compile(r"(?P<label>[가-힣A-Za-z][가-힣A-Za-z0-9 _-]{0,39}?) *[:：](?P<blank> {4,})")
FIXED_END = re.compile(r"\([^()\r\n]{1,30}\) *")


def paragraphs(blocks):
    for block in blocks:
        if isinstance(block, ParsedParagraph):
            yield block
        elif isinstance(block, ParsedTable):
            for row in block.rows:
                for cell in row.cells:
                    yield from paragraphs(cell.blocks)


def regions(text):
    """Two or more label:blank groups followed by a fixed parenthesized suffix."""
    matches = []
    position = len(text) - len(text.lstrip(" "))
    while match := LABEL_BLANK.match(text, position):
        matches.append(match)
        position = match.end()
    if len(matches) < 2 or not FIXED_END.fullmatch(text[position:]):
        return []
    return matches


def extract_inline(parsed):
    warnings = parsed.metadata.get("warnings", [])
    for section in parsed.sections:
        for paragraph in paragraphs(section.blocks):
            native = paragraph.location.native_ref
            path = native.get("element_path")
            if (paragraph.has_non_text_content or native.get("fragment_index") != 0
                    or not isinstance(path, list) or not native.get("text_element_paths")):
                continue
            if any(w.get("native_ref", {}).get("section_file") == native.get("section_file")
                   and w.get("native_ref", {}).get("element_path", [])[:len(path)] == path
                   for w in warnings):
                continue
            for match in regions(paragraph.text):
                start, end = match.span("blank")
                target = paragraph.location.model_copy(deep=True)
                target.type = LocationType.PARAGRAPH_INLINE
                # Stored only in location_info, never in Analyzer/GMS hints.
                target.native_ref["inline_range"] = {
                    "start": start, "end": end, "paragraph_text": paragraph.text,
                }
                label = match.group("label")
                yield FieldCandidate(candidate_id="pending", label=label,
                    normalized_label=normalize_label(label), relation="SAME_CELL",
                    label_location=paragraph.location.model_copy(deep=True), target_location=target,
                    current_text=paragraph.text[start:end], input_shape="SHORT_TEXT",
                    context=paragraph.text, confidence=0.8, hints={"target_kind": "inline_blank"})
