"""Text-only paragraph range edits; no business labels or Source keys."""
from dataclasses import dataclass
from xml.dom import Node

from ..parser.models import ParsedParagraph, ParsedTable
from .errors import DocumentWriteError as Error


def paragraph_map(document):
    found = {}
    def walk(blocks):
        for block in blocks:
            if isinstance(block, ParsedParagraph):
                n = block.location.native_ref
                key = (n["section_file"], tuple(n["element_path"]))
                if key in found:
                    found[key] = None  # Fragmented paragraphs are not writable.
                else:
                    found[key] = block
            elif isinstance(block, ParsedTable):
                for row in block.rows:
                    for cell in row.cells:
                        walk(cell.blocks)
    for section in document.sections:
        walk(section.blocks)
    return found


@dataclass
class InlineEdit:
    key: tuple
    paragraph: object
    segments: list
    original: str
    text: str
    expected: str = ""


def preflight_inline(field, documents, parsed):
    from .hwpx import resolve, elements, HP, format_value
    info = field.location_info
    if type(info.get("version")) is not int or info["version"] != 1:
        raise Error("LOCATION_VERSION_UNSUPPORTED")
    if info.get("hints", {}).get("target_kind") != "inline_blank":
        raise Error("TARGET_KIND_UNSUPPORTED")
    loc = info["target_location"]
    native = loc.get("native_ref", {})
    filename, path = native.get("section_file"), native.get("element_path")
    if filename not in documents:
        raise Error("SECTION_FILE_NOT_FOUND")
    p = resolve(documents[filename].documentElement, path)
    if native.get("element_name") != "p" or p.localName != "p" or p.namespaceURI != HP:
        raise Error("TARGET_ELEMENT_MISMATCH")
    original = parsed.get((filename, tuple(path)))
    if original is None:
        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
    actual = original.location.model_dump()
    for key in ("section_index", "block_index", "paragraph_index", "table_index", "row_index", "column_index"):
        if loc.get(key) != actual[key]:
            raise Error("TARGET_METADATA_MISMATCH")
    for key in ("xml_id", "fragment_index", "text_element_paths"):
        if native.get(key) != actual["native_ref"].get(key):
            raise Error("TARGET_METADATA_MISMATCH")
    region = native.get("inline_range", {})
    start, end = region.get("start"), region.get("end")
    expected = region.get("paragraph_text")
    if (type(start) is not int or type(end) is not int or not isinstance(expected, str)
            or not 0 <= start < end <= len(expected)):
        raise Error("INLINE_RANGE_INVALID")
    if (original.text != expected or info.get("current_text") != expected[start:end]
            or not expected[start:end] or set(expected[start:end]) != {" "}):
        raise Error("TARGET_CONTENT_MISMATCH")
    # Map logical codepoint offsets to existing text nodes; no controls/objects/markers.
    offset, segments = 0, []
    for run in elements(p):
        if run.namespaceURI == HP and run.localName == "linesegarray":
            continue
        if run.namespaceURI != HP or run.localName != "run":
            raise Error("TARGET_STRUCTURE_UNSUPPORTED")
        for t in elements(run):
            if t.namespaceURI != HP or t.localName != "t" or elements(t):
                raise Error("TARGET_STRUCTURE_UNSUPPORTED")
            for node in t.childNodes:
                if node.nodeType not in {Node.TEXT_NODE, Node.CDATA_SECTION_NODE}:
                    continue
                segments.append((node, offset, offset + len(node.data)))
                offset += len(node.data)
    if "".join(n.data for n, _, _ in segments) != expected:
        raise Error("TARGET_CONTENT_MISMATCH")
    if field.value_type != "TEXT":
        raise Error("VALUE_TYPE_UNSUPPORTED")
    text = format_value(field)
    if "\n" in text:
        raise Error("INLINE_MULTILINE_UNSUPPORTED")
    return InlineEdit((filename, tuple(path), start, end), p, segments, expected, text)


def prepare_edits(plans):
    """Reject overlapping writes including cell/descendant paragraph conflicts."""
    for index, left in enumerate(plans):
        for right in plans[index + 1:]:
            if left.key[0] != right.key[0]:
                continue
            a, b = left.key[1], right.key[1]
            if isinstance(left, InlineEdit) and isinstance(right, InlineEdit) and a == b:
                if left.key[2] < right.key[3] and right.key[2] < left.key[3]:
                    raise Error("DUPLICATE_TARGET")
            elif a[:len(b)] == b or b[:len(a)] == a:
                raise Error("DUPLICATE_TARGET")
    groups = {}
    for plan in plans:
        if isinstance(plan, InlineEdit):
            groups.setdefault(plan.key[:2], []).append(plan)
    for group in groups.values():
        expected = group[0].original
        for plan in sorted(group, key=lambda p: p.key[2], reverse=True):
            expected = expected[:plan.key[2]] + plan.text + expected[plan.key[3]:]
        for plan in group:
            plan.expected = expected
    return sorted(plans, key=lambda p: p.key[2] if isinstance(p, InlineEdit) else -1, reverse=True)


def mutate_inline(plan):
    from .hwpx import elements
    start, end = plan.key[2:]
    inserted = False
    for node, lo, hi in plan.segments:
        a, b = max(start, lo), min(end, hi)
        if a >= b:
            continue
        # Higher offsets were already edited; the prefix coordinates remain valid.
        node.data = node.data[:a-lo] + (plan.text if not inserted else "") + node.data[b-lo:]
        inserted = True
    for node in elements(plan.paragraph):
        if node.localName == "linesegarray":
            plan.paragraph.removeChild(node)
