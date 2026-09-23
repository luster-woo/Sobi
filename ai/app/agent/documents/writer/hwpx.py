"""Deterministic, strict HWPX writer. No Runtime execution or external services."""
from copy import copy
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
import io
import math
import os
from pathlib import Path
import re
import tempfile
from xml.dom import Node, minidom
import zipfile

from ..parser import HwpxParser, DocumentParseError
from ..parser.models import ParsedTable
from ..runtime.models import DocumentRuntimeResult
from .errors import DocumentWriteError as Error
from .models import HwpxWriteResult
from .inline import InlineEdit, paragraph_map, preflight_inline, prepare_edits, mutate_inline

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
SECTION = re.compile(r"Contents/section[0-9]+\.xml")
MAX_BYTES = 128 * 1024 * 1024
MAX_VALUE_LENGTH = 100000


def elements(node):
    # ElementTree's default parser ignores comments and processing instructions.
    return [child for child in node.childNodes if child.nodeType == Node.ELEMENT_NODE]


def resolve(root, path):
    if not isinstance(path, list) or not path or any(type(i) is not int or i < 0 for i in path):
        raise Error("TARGET_PATH_NOT_FOUND")
    node = root
    for index in path:
        children = elements(node)
        if index >= len(children):
            raise Error("TARGET_PATH_NOT_FOUND")
        node = children[index]
    return node


def cells(document):
    result = {}

    def visit(blocks):
        for block in blocks:
            if isinstance(block, ParsedTable):
                for row in block.rows:
                    for cell in row.cells:
                        native = cell.location.native_ref
                        result[(native["section_file"], tuple(native["element_path"]))] = cell
                        visit(cell.blocks)

    for section in document.sections:
        visit(section.blocks)
    return result


def format_value(field):
    value = field.value
    if field.value_type == "TEXT":
        if not isinstance(value, str):
            raise Error("INVALID_VALUE")
        text = value
    elif field.value_type == "NUMBER":
        if type(value) is int:
            # Bound expansion before converting an enormous integer.
            if value.bit_length() > MAX_VALUE_LENGTH * 3:
                raise Error("VALUE_LIMIT_EXCEEDED")
            text = str(value)
        elif isinstance(value, Decimal) or type(value) is float:
            if isinstance(value, float):
                if not math.isfinite(value):
                    raise Error("INVALID_VALUE")
                value = Decimal(str(value))
            if not value.is_finite():
                raise Error("INVALID_VALUE")
            if abs(value.as_tuple().exponent) + len(value.as_tuple().digits) > MAX_VALUE_LENGTH:
                raise Error("VALUE_LIMIT_EXCEEDED")
            text = format(value, "f")
        else:
            raise Error("INVALID_VALUE")
    else:
        raise Error("VALUE_TYPE_UNSUPPORTED")
    if not text or len(text) > MAX_VALUE_LENGTH:
        raise Error("INVALID_VALUE")
    # Tabs need width/leader contract; CR has normalization ambiguity. LF is supported.
    if any(not (char == "\n" or " " <= char <= "\ud7ff" or "\ue000" <= char <= "\ufffd"
                    or "\U00010000" <= char <= "\U0010ffff") for char in text):
        raise Error("TEXT_CHARACTER_UNSUPPORTED")
    return text


@dataclass
class Mutation:
    key: tuple
    target: object
    paragraphs: list
    anchor: object
    kind: str
    text: str
    expected: str
    replacement_nodes: list | None = None


def parse_date(value):
    """Shared strict date contract for placeholders and empty table cells."""
    if type(value) is date:
        return value
    if isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass
    raise Error("INVALID_DATE_VALUE") from None


def date_placeholder(field, hints, paragraphs, current):
    """Only the observed standalone Korean date paragraph; preserve helper XML."""
    if field.value_type != "DATE":
        raise Error("VALUE_TYPE_UNSUPPORTED")
    placeholder = hints.get("placeholder_text")
    if not isinstance(placeholder, str) or not re.fullmatch(r"년[ ]*월[ ]*일", placeholder):
        raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
    helper = hints.get("helper_text")
    if helper is not None and (not isinstance(helper, str) or not helper):
        raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
    expected_original = placeholder + ("\n" + helper if helper else "")
    if current != expected_original or (not helper and len(paragraphs) != 1):
        raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
    # The observed first paragraph consists of text-only t nodes (possibly several runs).
    # Inline helper/control layouts are intentionally unsupported, not flattened.
    nodes = []
    for run in elements(paragraphs[0]):
        if run.localName != "run":
            continue
        for t in elements(run):
            if elements(t):
                raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
            nodes.extend(n for n in t.childNodes if n.nodeType in {Node.TEXT_NODE, Node.CDATA_SECTION_NODE})
    if not nodes or "".join(n.data for n in nodes) != placeholder:
        raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
    parsed_date = parse_date(field.value)
    rendered = f"{parsed_date.year:04d}년 {parsed_date.month:02d}월 {parsed_date.day:02d}일"
    return rendered, rendered + current[len(placeholder):], nodes


def supported_structure(tc):
    """Accept simple p/run/t cells only; never flatten controls or nested objects."""
    ancestor = tc.parentNode
    while ancestor and ancestor.nodeType == Node.ELEMENT_NODE:
        if ancestor.localName == "tc":
            raise Error("TARGET_STRUCTURE_UNSUPPORTED")
        ancestor = ancestor.parentNode
    sublists = [n for n in elements(tc) if n.localName == "subList"]
    if len(sublists) != 1:
        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
    paragraphs = elements(sublists[0])
    if not paragraphs or any(p.localName != "p" or p.namespaceURI != HP for p in paragraphs):
        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
    for p in paragraphs:
        for node in elements(p):
            if node.namespaceURI != HP or node.localName not in {"run", "linesegarray"}:
                raise Error("TARGET_STRUCTURE_UNSUPPORTED")
            if node.localName == "run":
                for t in elements(node):
                    if t.namespaceURI != HP or t.localName != "t":
                        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
                    if any(c.namespaceURI != HP or c.localName not in {
                        "lineBreak", "tab", "nbSpace", "fwSpace", "hyphen"
                    } or elements(c) for c in elements(t)):
                        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
    runs = [n for n in elements(paragraphs[0]) if n.localName == "run"]
    if not runs:
        raise Error("TARGET_STRUCTURE_UNSUPPORTED")
    return paragraphs, runs[0]


def preflight(field, documents, parsed_cells):
    info = field.location_info
    if not info:
        raise Error("LOCATION_INFO_MISSING")
    if type(info.get("version")) is not int or info["version"] != 1:
        raise Error("LOCATION_VERSION_UNSUPPORTED")
    location = info.get("target_location")
    if not isinstance(location, dict):
        raise Error("LOCATION_INFO_MISSING")
    if location.get("type") != "TABLE_CELL":
        raise Error("TARGET_TYPE_UNSUPPORTED")
    native = location.get("native_ref")
    if not isinstance(native, dict):
        raise Error("LOCATION_INFO_MISSING")
    section_file = native.get("section_file")
    if not isinstance(section_file, str) or section_file not in documents:
        raise Error("SECTION_FILE_NOT_FOUND")
    path = native.get("element_path")
    target = resolve(documents[section_file].documentElement, path)
    if native.get("element_name") != "tc" or target.localName != "tc" or target.namespaceURI != HP:
        raise Error("TARGET_ELEMENT_MISMATCH")
    key = (section_file, tuple(path))
    cell = parsed_cells.get(key)
    if cell is None:
        raise Error("TARGET_PATH_NOT_FOUND")
    actual = cell.location.model_dump()
    for name in ("section_index", "table_index", "row_index", "column_index", "block_index", "paragraph_index"):
        if name in location and location[name] != actual[name]:
            raise Error("TARGET_METADATA_MISMATCH")
    for name in ("row_order", "cell_order", "xml_id"):
        if name in native and native[name] != actual["native_ref"].get(name):
            raise Error("TARGET_METADATA_MISMATCH")
    current = info.get("current_text")
    if not isinstance(current, str) or current != cell.text:
        raise Error("TARGET_CONTENT_MISMATCH")
    hints = info.get("hints")
    if not isinstance(hints, dict):
        raise Error("TARGET_KIND_UNSUPPORTED")
    kind = hints.get("target_kind")
    if kind not in {"empty", "helper", "unit_suffix", "placeholder"}:
        raise Error("TARGET_KIND_UNSUPPORTED")
    if kind == "empty" and current.strip():
        raise Error("TARGET_CONTENT_MISMATCH")
    if kind == "helper" and (not current.strip() or hints.get("helper_text") != current):
        raise Error("TARGET_CONTENT_MISMATCH")
    if kind == "unit_suffix":
        if hints.get("insertion_mode") != "BEFORE_SUFFIX":
            raise Error("INSERTION_MODE_UNSUPPORTED")
        if not current.strip():
            raise Error("TARGET_CONTENT_MISMATCH")
    paragraphs, anchor = supported_structure(target)
    if kind == "empty":
        # Safe p/run/t structure must correspond one-to-one to Parser paragraphs.
        # Never flatten a fragmented/ambiguous cell or accept nonblank paragraphs.
        if len(paragraphs) != len(cell.paragraphs):
            raise Error("TARGET_STRUCTURE_UNSUPPORTED")
        if any(p.text.strip() for p in cell.paragraphs):
            raise Error("TARGET_CONTENT_MISMATCH")
    if kind == "placeholder":
        text, expected, nodes = date_placeholder(field, hints, paragraphs, current)
        return Mutation(key, target, paragraphs, anchor, kind, text, expected, nodes)
    text = (parse_date(field.value).isoformat()
            if kind == "empty" and field.value_type == "DATE" else format_value(field))
    # Parser joins every cell paragraph with LF, including blank trailing paragraphs.
    expected = ("\n".join([text, *(p.text for p in cell.paragraphs[1:])])
                if kind == "empty" else text + current)
    return Mutation(key, target, paragraphs, anchor, kind, text, expected)


def insert_text(run, text):
    document = run.ownerDocument
    existing = elements(run)
    if existing:
        t = existing[0]
    else:
        name = f"{run.prefix}:t" if run.prefix else "t"
        t = document.createElementNS(HP, name)
        run.appendChild(t)
    before = t.firstChild
    for index, part in enumerate(text.split("\n")):
        if index:
            name = f"{t.prefix}:lineBreak" if t.prefix else "lineBreak"
            t.insertBefore(document.createElementNS(HP, name), before)
        if part:
            t.insertBefore(document.createTextNode(part), before)


def mutate(plan):
    changed = plan.paragraphs[:1]
    if plan.kind == "empty":
        for p in changed:
            for run in elements(p):
                if run.localName == "run":
                    for t in elements(run):
                        for node in list(t.childNodes):
                            t.removeChild(node)
    if plan.kind == "placeholder":
        plan.replacement_nodes[0].data = plan.text
        for node in plan.replacement_nodes[1:]:
            node.data = ""
    else:
        insert_text(plan.anchor, plan.text)
    for paragraph in changed:
        # Optional cached line layout becomes invalid after changing text (Hancom guidance).
        for node in elements(paragraph):
            if node.localName == "linesegarray":
                paragraph.removeChild(node)


class HwpxWriter:
    def write(self, *, source_path: str | Path, runtime_result: DocumentRuntimeResult,
              output_path: str | Path) -> HwpxWriteResult:
        try:
            return self._write(Path(source_path), runtime_result, Path(output_path))
        except Error:
            raise
        except Exception:
            raise Error("WRITER_FAILED") from None

    def _write(self, source, runtime, output):
        if not runtime.ready_for_write or any(f.field_type != "USER_INPUT" and f.required and f.runtime_status != "RESOLVED" for f in runtime.fields):
            raise Error("WRITER_NOT_READY")
        if source.suffix.lower() != ".hwpx":
            raise Error("UNSUPPORTED_SOURCE_FORMAT")
        if not source.exists():
            raise Error("SOURCE_FILE_NOT_FOUND")
        if not source.is_file():
            raise Error("SOURCE_NOT_FILE")
        if output.suffix.lower() != ".hwpx":
            raise Error("UNSUPPORTED_OUTPUT_FORMAT")
        if source.resolve() == output.resolve():
            raise Error("SOURCE_OUTPUT_CONFLICT")
        if os.path.lexists(output):
            raise Error("OUTPUT_ALREADY_EXISTS")
        if not output.parent.is_dir():
            raise Error("OUTPUT_DIRECTORY_NOT_FOUND")
        with source.open("rb") as stream:
            data = stream.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise Error("DOCUMENT_LIMIT_EXCEEDED")
        try:
            archive = zipfile.ZipFile(io.BytesIO(data))
        except zipfile.BadZipFile:
            raise Error("INVALID_HWPX_ARCHIVE") from None
        with archive, tempfile.TemporaryDirectory(prefix=".hwpx-writer-", dir=output.parent) as working:
            entries = archive.infolist()
            if len({i.filename for i in entries}) != len(entries):
                raise Error("INVALID_HWPX_ARCHIVE")
            if sum(i.file_size for i in entries) > MAX_BYTES:
                raise Error("DOCUMENT_LIMIT_EXCEEDED")
            try:
                if archive.testzip() is not None:
                    raise Error("INVALID_HWPX_ARCHIVE")
            except (zipfile.BadZipFile, RuntimeError, NotImplementedError):
                raise Error("INVALID_HWPX_ARCHIVE") from None
            # Parser sees the exact bytes being written, even if the source is replaced concurrently.
            snapshot = Path(working) / "snapshot.hwpx"
            snapshot.write_bytes(data)
            try:
                parsed = HwpxParser().parse(snapshot)
            except DocumentParseError:
                raise Error("INVALID_HWPX_ARCHIVE") from None
            # Parser has already rejected DTDs and excessive XML depth/size.
            documents = {i.filename: minidom.parseString(archive.read(i)) for i in entries
                         if SECTION.fullmatch(i.filename)}
            try:
                parsed_cells = cells(parsed)
                parsed_paragraphs = paragraph_map(parsed)
                plans = [preflight_inline(f, documents, parsed_paragraphs)
                         if f.location_info.get("target_location", {}).get("type") == "PARAGRAPH_INLINE"
                         else preflight(f, documents, parsed_cells)
                         for f in runtime.fields if f.runtime_status == "RESOLVED"]
                for plan in prepare_edits(plans):
                    if isinstance(plan, InlineEdit):
                        mutate_inline(plan)
                    else:
                        mutate(plan)
                changed = {plan.key[0] for plan in plans}
                draft = Path(working) / "draft.hwpx"
                with zipfile.ZipFile(draft, "w") as target:
                    target.comment = archive.comment
                    for info in entries:
                        content = (documents[info.filename].toxml(encoding="utf-8") if info.filename in changed
                                   else archive.read(info))
                        target.writestr(copy(info), content)
                self._validate(draft, plans)
                with draft.open("r+b") as stream:
                    os.fsync(stream.fileno())
                try:
                    # Atomic create-if-absent; unlike replace(), never overwrite a concurrent writer.
                    os.link(draft, output)
                except FileExistsError:
                    raise Error("OUTPUT_ALREADY_EXISTS") from None
                except OSError:
                    raise Error("OUTPUT_PUBLISH_FAILED") from None
            finally:
                for document in documents.values():
                    document.unlink()
        return HwpxWriteResult(source_path=str(source), output_path=str(output), total_fields=len(runtime.fields),
                               written_count=len(plans), skipped_count=len(runtime.fields) - len(plans))

    def _validate(self, draft, plans):
        try:
            with zipfile.ZipFile(draft) as archive:
                if archive.testzip() is not None:
                    raise ValueError()
            parsed = HwpxParser().parse(draft)
            written, paragraphs = cells(parsed), paragraph_map(parsed)
            for plan in plans:
                target = paragraphs.get(plan.key[:2]) if isinstance(plan, InlineEdit) else written.get(plan.key)
                if target is None or target.text != plan.expected:
                    raise ValueError()
        except Exception:
            raise Error("OUTPUT_VALIDATION_FAILED") from None
