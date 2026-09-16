"""ZIP/XML 읽기 전용 구조 Parser. DB/Normalizer/Source/LLM과 독립적이다."""

from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile
import zlib

from .enums import DocumentFormat, LocationType
from .errors import DocumentParseError
from .models import (
    DocumentLocation, ParsedDocument, ParsedParagraph, ParsedSection,
    ParsedTable, ParsedTableCell, ParsedTableRow,
)

SECTION = re.compile(r"Contents/section([0-9]+)\.xml")
TEXT_CONTROLS = {"lineBreak": "\n", "tab": "\t", "nbSpace": "\u00a0", "fwSpace": "\u3000", "hyphen": "-"}
TEXT_MARKERS = {"markpenBegin", "markpenEnd", "titleMark"}
LAYOUT = {"linesegarray", "secPr", "colPr", "charPr", "paraPr"}
OBJECTS = {"pic", "ole", "equation", "rect", "ellipse", "line", "polygon", "curve", "container", "textart", "video"}


def tag(element):
    return element.tag.rsplit("}", 1)[-1]


def child(element, name):
    return next((node for node in element if tag(node) == name), None)


class _TreeBuilder(ET.TreeBuilder):
    def __init__(self, max_depth):
        super().__init__()
        self.depth = 0
        self.max_depth = max_depth

    def start(self, name, attrs):
        self.depth += 1
        if self.depth > self.max_depth:
            raise DocumentParseError("DOCUMENT_LIMIT_EXCEEDED")
        return super().start(name, attrs)

    def end(self, name):
        result = super().end(name)
        self.depth -= 1
        return result

    def doctype(self, name, pubid, system):
        raise DocumentParseError("XML_DTD_UNSUPPORTED")


class HwpxParser:
    def __init__(self, *, max_section_bytes=16 * 1024 * 1024,
                 max_total_bytes=64 * 1024 * 1024, max_depth=128):
        for value in (max_section_bytes, max_total_bytes, max_depth):
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                raise ValueError("Parser 제한값은 양의 정수여야 합니다.")
        self.max_section_bytes = max_section_bytes
        self.max_total_bytes = max_total_bytes
        self.max_depth = max_depth

    def parse(self, source_path: str | Path) -> ParsedDocument:
        try:
            path = Path(source_path)
            if path.suffix.lower() != ".hwpx":
                raise DocumentParseError("UNSUPPORTED_FORMAT")
            if not path.exists():
                raise DocumentParseError("SOURCE_NOT_FOUND")
            if not path.is_file():
                raise DocumentParseError("SOURCE_NOT_FILE")
            state = _DocumentState()
            sections = []
            with zipfile.ZipFile(path, "r") as archive:
                entries = [(int(match[1]), info) for info in archive.infolist()
                           if (match := SECTION.fullmatch(info.filename))]
                if not entries:
                    raise DocumentParseError("SECTION_NOT_FOUND")
                entries.sort(key=lambda pair: pair[0])
                if len({index for index, _ in entries}) != len(entries):
                    raise DocumentParseError("INVALID_SECTION")
                total = 0
                for index, info in entries:
                    total += info.file_size
                    if info.file_size > self.max_section_bytes or total > self.max_total_bytes:
                        raise DocumentParseError("DOCUMENT_LIMIT_EXCEEDED")
                    with archive.open(info) as stream:
                        data = stream.read(self.max_section_bytes + 1)
                    if len(data) > self.max_section_bytes:
                        raise DocumentParseError("DOCUMENT_LIMIT_EXCEEDED")
                    root = ET.fromstring(data, parser=ET.XMLParser(target=_TreeBuilder(self.max_depth)))
                    if tag(root) != "sec":
                        raise DocumentParseError("INVALID_SECTION")
                    section = _SectionReader(state, index, info.filename, root)
                    sections.append(ParsedSection(section_index=index, blocks=section.blocks(root)))
            return ParsedDocument(
                format=DocumentFormat.HWPX, sections=sections,
                metadata={"warnings": state.warnings},
            )
        except DocumentParseError:
            raise
        except ET.ParseError:
            raise DocumentParseError("MALFORMED_XML") from None
        except (zipfile.BadZipFile, zipfile.LargeZipFile, zlib.error, EOFError, RuntimeError, NotImplementedError):
            raise DocumentParseError("INVALID_ZIP") from None
        except (OSError, ValueError, TypeError):
            raise DocumentParseError("FILE_READ_ERROR") from None


class _DocumentState:
    def __init__(self):
        self.table_count = 0
        self.warnings = []


class _SectionReader:
    def __init__(self, state, section_index, section_file, root):
        self.state = state
        self.index = section_index
        self.file = section_file
        self.paths = {}
        self._index_paths(root, [])

    def _index_paths(self, element, path):
        self.paths[element] = path
        for index, node in enumerate(element):
            self._index_paths(node, path + [index])

    def native(self, element):
        result = {"section_file": self.file, "element_path": self.paths[element],
                  "element_name": tag(element)}
        if element.get("id") is not None:
            result["xml_id"] = element.get("id")
        return result

    def warn(self, code, element):
        self.state.warnings.append({"code": code, "native_ref": self.native(element)})

    def location(self, kind, element, **indices):
        return DocumentLocation(type=kind, section_index=self.index,
                                native_ref=self.native(element), **indices)

    def blocks(self, container, *, table_index=None, row_index=None, column_index=None):
        result = []
        paragraph_index = 0
        for element in container:
            name = tag(element)
            if name == "p":
                self.paragraph(element, result, paragraph_index, table_index, row_index, column_index)
                paragraph_index += 1
            elif name == "tbl":
                result.append(self.table(element, len(result)))
            elif name not in LAYOUT:
                self.warn("UNSUPPORTED_BLOCK", element)
        return result

    def text(self, element):
        # hp:t 안의 실제 문자열과 표시 문자만 수집. 제어 속성/스크립트는 읽지 않는다.
        parts = [element.text or ""]
        for node in element:
            name = tag(node)
            if name in TEXT_CONTROLS:
                parts.append(TEXT_CONTROLS[name])
            elif name not in TEXT_MARKERS:
                self.warn("UNSUPPORTED_TEXT_CONTROL", node)
            parts.append(node.tail or "")
        return "".join(parts)

    def events(self, element):
        for node in element:
            name = tag(node)
            if name == "run":
                yield from self.events(node)
            elif name == "t":
                yield ("text", node, self.text(node))
            elif name in TEXT_CONTROLS:
                yield ("text", node, TEXT_CONTROLS[name])
            elif name == "tbl":
                yield ("table", node, None)
            elif name in OBJECTS:
                self.warn("UNSUPPORTED_OBJECT", node)
                yield ("object", node, None)
            elif name == "ctrl":
                # 필드 제어 값, 각주/머리말 등의 별도 본문을 현재 문단에 섞지 않는다.
                self.warn("UNSUPPORTED_CONTROL", node)
            elif name not in LAYOUT:
                self.warn("UNSUPPORTED_INLINE", node)

    def paragraph(self, element, blocks, paragraph_index, table_index, row_index, column_index):
        chunks, text_paths = [], []
        non_text = False
        fragment = 0
        has_table = False

        def flush(force=False):
            nonlocal chunks, text_paths, non_text, fragment
            if not force and not "".join(chunks) and not non_text:
                chunks, text_paths = [], []
                return
            location = self.location(
                LocationType.PARAGRAPH, element, block_index=len(blocks),
                paragraph_index=paragraph_index, table_index=table_index,
                row_index=row_index, column_index=column_index,
            )
            location.native_ref.update(fragment_index=fragment, text_element_paths=text_paths)
            blocks.append(ParsedParagraph(block_index=len(blocks), text="".join(chunks),
                                          has_non_text_content=non_text, location=location))
            fragment += 1
            chunks, text_paths, non_text = [], [], False

        for kind, node, value in self.events(element):
            if kind == "table":
                flush()
                blocks.append(self.table(node, len(blocks)))
                has_table = True
            elif kind == "object":
                non_text = True
            else:
                chunks.append(value)
                text_paths.append(self.paths[node])
        flush(force=not has_table)

    def number(self, element, attribute, fallback, *, minimum=0):
        raw = element.get(attribute) if element is not None else None
        if raw is None:
            return fallback
        try:
            value = int(raw)
            if value < minimum:
                raise ValueError
            return value
        except ValueError:
            self.warn("INVALID_CELL_GEOMETRY", element)
            return fallback

    def table(self, element, block_index):
        table_index = self.state.table_count
        self.state.table_count += 1
        rows = []
        occupied = []  # (row, col, row_span, col_span); 큰 span도 거대한 격자로 확장하지 않는다.
        for row_order, tr in enumerate(node for node in element if tag(node) == "tr"):
            cells = []
            row_nodes = [node for node in tr if tag(node) == "tc"]
            first_addr = child(row_nodes[0], "cellAddr") if row_nodes else None
            row_index = self.number(first_addr, "rowAddr", row_order)
            next_column = 0
            for cell_order, tc in enumerate(row_nodes):
                addr, span = child(tc, "cellAddr"), child(tc, "cellSpan")
                r = self.number(addr, "rowAddr", row_index)
                rs = self.number(span, "rowSpan", 1, minimum=1)
                cs = self.number(span, "colSpan", 1, minimum=1)
                fallback = next_column
                # 병합으로 앞 행에서 점유한 열도 건너뛴다.
                while True:
                    conflicts = [(rr, cc, rrn, ccn) for rr, cc, rrn, ccn in occupied
                                 if rr < r + rs and r < rr + rrn and cc < fallback + cs and fallback < cc + ccn]
                    if not conflicts:
                        break
                    fallback = max(cc + ccn for _, cc, _, ccn in conflicts)
                c = self.number(addr, "colAddr", fallback)
                if r != row_index:
                    self.warn("INCONSISTENT_ROW_ADDRESS", tc)
                if any(rr < r + rs and r < rr + rrn and cc < c + cs and c < cc + ccn
                       for rr, cc, rrn, ccn in occupied):
                    self.warn("OVERLAPPING_CELL_ADDRESS", tc)
                occupied.append((r, c, rs, cs))
                next_column = c + cs
                sublist = child(tc, "subList")
                if sum(tag(node) == "subList" for node in tc) > 1:
                    self.warn("MULTIPLE_CELL_SUBLISTS", tc)
                cell_blocks = self.blocks(sublist if sublist is not None else tc,
                                          table_index=table_index, row_index=r, column_index=c)
                paragraphs = [b for b in cell_blocks if isinstance(b, ParsedParagraph)]
                text = "\n".join(p.text for p in paragraphs)
                nested = [b for b in cell_blocks if isinstance(b, ParsedTable)]
                has_objects = any(p.has_non_text_content for p in paragraphs)
                nested_nonempty = any(not cell.is_empty for t in nested for row in t.rows for cell in row.cells)
                location = self.location(LocationType.TABLE_CELL, tc, block_index=block_index,
                                         table_index=table_index, row_index=r, column_index=c)
                location.native_ref.update(row_order=row_order, cell_order=cell_order)
                cells.append(ParsedTableCell(
                    row_index=r, column_index=c, row_span=rs, column_span=cs,
                    text=text, paragraphs=paragraphs, blocks=cell_blocks,
                    is_empty=not text.strip() and not has_objects and not nested_nonempty,
                    has_non_text_content=has_objects, location=location,
                ))
            rows.append(ParsedTableRow(row_index=row_index, cells=cells))
        for node in element:
            if tag(node) in {"caption"}:
                self.warn("UNSUPPORTED_TABLE_CAPTION", node)
        return ParsedTable(
            block_index=block_index, table_index=table_index, rows=rows,
            location=self.location(LocationType.TABLE, element, block_index=block_index, table_index=table_index),
        )
