"""최소 HWPX ZIP fixture를 메모리/임시 파일로 구성한다. 외부 변환기는 필요 없다."""

import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
import zipfile

from app.agent.documents.parser import HwpxParser, DocumentParseError
from app.agent.documents.parser.enums import DocumentFormat, LocationType
from app.agent.documents.parser.models import ParsedDocument, ParsedParagraph, ParsedTable

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HS = "http://www.hancom.co.kr/hwpml/2011/section"


def paragraph(text="", *, runs=None):
    runs = [text] if runs is None else runs
    return '<hp:p id="0">' + "".join(
        "<hp:run><hp:t>" + escape(t) + "</hp:t></hp:run>" for t in runs
    ) + "</hp:p>"


def cell(text="", *, paragraphs=None, row=None, column=None, rs=1, cs=1, geometry=True):
    content = paragraph(text) if paragraphs is None else paragraphs
    address = ""
    if geometry:
        attrs = []
        if row is not None:
            attrs.append(f'rowAddr="{row}"')
        if column is not None:
            attrs.append(f'colAddr="{column}"')
        address = "<hp:cellAddr " + " ".join(attrs) + "/>"
    return (
        "<hp:tc><hp:subList>" + content + "</hp:subList>" + address
        + f'<hp:cellSpan rowSpan="{rs}" colSpan="{cs}"/></hp:tc>'
    )


def table(rows):
    return '<hp:tbl id="77">' + "".join("<hp:tr>" + row + "</hp:tr>" for row in rows) + "</hp:tbl>"


def anchored(tbl, before="", after=""):
    return '<hp:p id="0"><hp:run><hp:t>' + escape(before) + "</hp:t>" + tbl + "<hp:t>" + escape(after) + "</hp:t></hp:run></hp:p>"


def section(body, *, prefix="hp"):
    xml = f'<hs:sec xmlns:hs="{HS}" xmlns:hp="{HP}">{body}</hs:sec>'
    return xml.replace("xmlns:hp=", f"xmlns:{prefix}=").replace("hp:", prefix + ":")


class HwpxParserTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = self.root / "document.hwpx"
        self.parser = HwpxParser()

    def document(self, members):
        with zipfile.ZipFile(self.path, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, body in members.items():
                archive.writestr(name, body)
        return self.path

    def parse(self, body):
        self.document({"Contents/section0.xml": section(body)})
        return self.parser.parse(self.path)

    def assert_error(self, code, path=None, parser=None):
        with self.assertRaises(DocumentParseError) as caught:
            (parser or self.parser).parse(path or self.path)
        self.assertEqual(caught.exception.code, code)
        self.assertNotIn(str(self.root), json.dumps(caught.exception.as_dict()))
        return caught.exception

    def test_single_section_normal_document(self):
        parsed = self.parse(paragraph("본문"))
        self.assertEqual(parsed.format, DocumentFormat.HWPX)
        self.assertEqual(len(parsed.sections), 1)
        self.assertEqual(parsed.sections[0].section_index, 0)
        self.assertEqual(parsed.sections[0].blocks[0].text, "본문")

    def test_sections_numeric_order_with_gaps(self):
        self.document({f"Contents/section{i}.xml": section(paragraph(str(i))) for i in [10, 2, 0]})
        parsed = self.parser.parse(self.path)
        self.assertEqual([s.section_index for s in parsed.sections], [0, 2, 10])
        self.assertEqual([s.blocks[0].text for s in parsed.sections], ["0", "2", "10"])

    def test_runs_join_without_added_spaces(self):
        parsed = self.parse(paragraph(runs=["대표", "자명", " ", "ABC"]))
        self.assertEqual(parsed.sections[0].blocks[0].text, "대표자명 ABC")

    def test_namespace_prefix_changes(self):
        self.document({"Contents/section0.xml": section(paragraph("값"), prefix="other")})
        self.assertEqual(self.parser.parse(self.path).sections[0].blocks[0].text, "값")

    def test_default_namespace(self):
        self.document({"Contents/section0.xml":
                       f'<sec xmlns="{HS}"><p xmlns="{HP}"><run><t>본문</t></run></p></sec>'})
        self.assertEqual(self.parser.parse(self.path).sections[0].blocks[0].text, "본문")

    def test_tabs_linebreak_entities_and_control_values(self):
        body = '<hp:p><hp:run><hp:ctrl><hp:fieldBegin name="HIDDEN"/></hp:ctrl>'
        body += '<hp:t>A&amp;B<hp:tab/>C<hp:lineBreak/>D<hp:nbSpace/>E</hp:t></hp:run></hp:p>'
        parsed = self.parse(body)
        self.assertEqual(parsed.sections[0].blocks[0].text, "A&B\tC\nD\u00a0E")
        self.assertNotIn("HIDDEN", parsed.model_dump_json())

    def test_empty_paragraph_kept_layout_not_paragraph(self):
        parsed = self.parse('<hp:p><hp:run><hp:secPr/></hp:run><hp:linesegarray/></hp:p>')
        self.assertEqual(len(parsed.sections[0].blocks), 1)
        self.assertEqual(parsed.sections[0].blocks[0].text, "")

    def test_table_multiple_rows_cells(self):
        parsed = self.parse(anchored(table([
            cell("a", row=0, column=0) + cell("b", row=0, column=1),
            cell("c", row=1, column=0) + cell("d", row=1, column=1),
        ])))
        tbl = parsed.sections[0].blocks[0]
        self.assertIsInstance(tbl, ParsedTable)
        self.assertEqual([[c.text for c in r.cells] for r in tbl.rows], [["a", "b"], ["c", "d"]])
        self.assertEqual([r.row_index for r in tbl.rows], [0, 1])
        self.assertEqual([c.column_index for c in tbl.rows[1].cells], [0, 1])

    def test_empty_cell_and_whitespace(self):
        tbl = self.parse(anchored(table([cell("대표자명") + cell("") + cell(" \n\t")]))).sections[0].blocks[0]
        self.assertEqual([c.is_empty for c in tbl.rows[0].cells], [False, True, True])

    def test_multiple_paragraphs_in_cell(self):
        tbl = self.parse(anchored(table([cell(paragraphs=paragraph("첫째") + paragraph("둘째"))]))).sections[0].blocks[0]
        c = tbl.rows[0].cells[0]
        self.assertEqual(c.text, "첫째\n둘째")
        self.assertEqual([p.text for p in c.paragraphs], ["첫째", "둘째"])
        self.assertEqual([p.location.paragraph_index for p in c.paragraphs], [0, 1])

    def test_merged_cell_addresses(self):
        tbl = self.parse(anchored(table([
            cell("merged", row=0, column=0, rs=2, cs=2) + cell("right", row=0, column=2),
            cell("next", row=1, column=2),
        ]))).sections[0].blocks[0]
        merged = tbl.rows[0].cells[0]
        self.assertEqual((merged.row_span, merged.column_span), (2, 2))
        self.assertEqual(tbl.rows[1].cells[0].column_index, 2)
        self.assertEqual(len(tbl.rows[1].cells), 1)

    def test_missing_address_skips_spanned_columns(self):
        tbl = self.parse(anchored(table([
            cell("merged", rs=2, cs=2, geometry=False) + cell("right", geometry=False),
            cell("next", geometry=False),
        ]))).sections[0].blocks[0]
        self.assertEqual(tbl.rows[0].cells[1].column_index, 2)
        self.assertEqual(tbl.rows[1].cells[0].column_index, 2)

    def test_invalid_spans_fall_back(self):
        parsed = self.parse(anchored(table([cell("a", rs="bad", cs=0)])))
        c = parsed.sections[0].blocks[0].rows[0].cells[0]
        self.assertEqual((c.row_span, c.column_span), (1, 1))
        self.assertEqual(len(parsed.metadata["warnings"]), 2)

    def test_missing_span_defaults(self):
        body = anchored(table([cell("a").replace('<hp:cellSpan rowSpan="1" colSpan="1"/>', "")]))
        c = self.parse(body).sections[0].blocks[0].rows[0].cells[0]
        self.assertEqual((c.row_span, c.column_span), (1, 1))

    def test_paragraph_table_order_and_no_cell_text_duplication(self):
        tbl = table([cell("inside")])
        blocks = self.parse(paragraph("first") + anchored(tbl) + paragraph("last") + anchored(tbl)).sections[0].blocks
        self.assertEqual([b.block_type for b in blocks], ["PARAGRAPH", "TABLE", "PARAGRAPH", "TABLE"])
        self.assertEqual([b.block_index for b in blocks], [0, 1, 2, 3])
        self.assertEqual([b.text for b in blocks if isinstance(b, ParsedParagraph)], ["first", "last"])

    def test_inline_table_splits_paragraph_with_native_identity(self):
        blocks = self.parse(anchored(table([cell("cell")]), before="before", after="after")).sections[0].blocks
        self.assertEqual([b.block_type for b in blocks], ["PARAGRAPH", "TABLE", "PARAGRAPH"])
        self.assertEqual([blocks[0].text, blocks[2].text], ["before", "after"])
        self.assertEqual(blocks[0].location.native_ref["element_path"], blocks[2].location.native_ref["element_path"])
        self.assertEqual(blocks[2].location.native_ref["fragment_index"], 1)

    def test_location_indices(self):
        parsed = self.parse(paragraph("a") + anchored(table([cell("b", row=0, column=0)])))
        tbl = parsed.sections[0].blocks[1]
        c = tbl.rows[0].cells[0]
        self.assertEqual(tbl.location.type, LocationType.TABLE)
        self.assertEqual((c.location.section_index, c.location.table_index,
                          c.location.row_index, c.location.column_index), (0, 0, 0, 0))
        self.assertEqual(c.location.block_index, 1)
        self.assertEqual(c.paragraphs[0].location.type, LocationType.PARAGRAPH)
        self.assertEqual(c.paragraphs[0].location.table_index, 0)

    def test_native_refs_relocate_every_xml_element(self):
        body = paragraph("a") + anchored(table([cell(paragraphs=paragraph("b") + paragraph("c"))]))
        parsed = self.parse(body)
        root = ET.fromstring(section(body))
        blocks = parsed.sections[0].blocks
        elements = [blocks[0], blocks[1], blocks[1].rows[0].cells[0],
                    *blocks[1].rows[0].cells[0].paragraphs]
        for element in elements:
            ref = element.location.native_ref
            self.assertEqual(ref["section_file"], "Contents/section0.xml")
            node = root
            for index in ref["element_path"]:
                node = node[index]
            self.assertEqual(node.tag.rsplit("}", 1)[-1], ref["element_name"])
            if "xml_id" in ref:
                self.assertEqual(node.get("id"), ref["xml_id"])

    def test_table_indices_global_across_sections(self):
        self.document({f"Contents/section{i}.xml": section(anchored(table([cell("a")]))) for i in [2, 0]})
        parsed = self.parser.parse(self.path)
        self.assertEqual([s.blocks[0].table_index for s in parsed.sections], [0, 1])

    def test_nested_tables_preserve_cell_blocks(self):
        inner = table([cell("nested")])
        outer = table([cell(paragraphs=paragraph("start") + anchored(inner) + paragraph("end"))])
        tbl = self.parse(anchored(outer)).sections[0].blocks[0]
        c = tbl.rows[0].cells[0]
        self.assertEqual([b.block_type for b in c.blocks], ["PARAGRAPH", "TABLE", "PARAGRAPH"])
        self.assertEqual(c.blocks[1].table_index, 1)
        self.assertEqual(c.text, "start\nend")
        self.assertEqual(c.blocks[1].rows[0].cells[0].text, "nested")

    def test_non_text_object_not_empty_and_warned(self):
        body = anchored(table([cell(paragraphs='<hp:p><hp:run><hp:pic id="1"/></hp:run></hp:p>')]))
        parsed = self.parse(body)
        c = parsed.sections[0].blocks[0].rows[0].cells[0]
        self.assertEqual(c.text, "")
        self.assertFalse(c.is_empty)
        self.assertTrue(c.has_non_text_content)
        self.assertEqual(parsed.metadata["warnings"][0]["code"], "UNSUPPORTED_OBJECT")

    def test_unknown_structure_does_not_fail_or_leak_text(self):
        parsed = self.parse('<hp:unknown><hp:t>not main body</hp:t></hp:unknown>' + paragraph("actual"))
        self.assertEqual([b.text for b in parsed.sections[0].blocks], ["actual"])
        self.assertEqual(parsed.metadata["warnings"][0]["code"], "UNSUPPORTED_BLOCK")

    def test_non_hwpx_rejected(self):
        self.assert_error("UNSUPPORTED_FORMAT", self.root / "file.hwp")

    def test_multiple_sublists_warn_without_flattening(self):
        tc = cell("first").replace("</hp:tc>", "<hp:subList>" + paragraph("second") + "</hp:subList></hp:tc>")
        parsed = self.parse(anchored(table([tc])))
        self.assertEqual(parsed.sections[0].blocks[0].rows[0].cells[0].text, "first")
        self.assertEqual(parsed.metadata["warnings"][0]["code"], "MULTIPLE_CELL_SUBLISTS")

    def test_missing_file(self):
        self.assert_error("SOURCE_NOT_FOUND")

    def test_directory_rejected(self):
        self.path.mkdir()
        self.assert_error("SOURCE_NOT_FILE")

    def test_corrupted_zip(self):
        self.path.write_bytes(b"not a zip")
        self.assert_error("INVALID_ZIP")

    def test_missing_section(self):
        self.document({"Contents/header.xml": "<header/>"})
        self.assert_error("SECTION_NOT_FOUND")

    def test_malformed_xml(self):
        self.document({"Contents/section0.xml": "<bad"})
        self.assert_error("MALFORMED_XML")

    def test_wrong_section_root(self):
        self.document({"Contents/section0.xml": "<notSection/>"})
        self.assert_error("INVALID_SECTION")

    def test_duplicate_section_numbers_rejected(self):
        self.document({"Contents/section1.xml": section(""), "Contents/section01.xml": section("")})
        self.assert_error("INVALID_SECTION")

    def test_dtd_rejected(self):
        self.document({"Contents/section0.xml": '<!DOCTYPE sec [<!ENTITY x "expanded">]><sec>&x;</sec>'})
        self.assert_error("XML_DTD_UNSUPPORTED")

    def test_size_limit(self):
        self.document({"Contents/section0.xml": section(paragraph("text"))})
        self.assert_error("DOCUMENT_LIMIT_EXCEEDED", parser=HwpxParser(max_section_bytes=10))

    def test_readonly_and_json_roundtrip(self):
        self.document({"Contents/section0.xml": section(anchored(table([cell("value")])) )})
        before = hashlib.sha256(self.path.read_bytes()).digest()
        parsed = self.parser.parse(self.path)
        self.assertEqual(hashlib.sha256(self.path.read_bytes()).digest(), before)
        decoded = ParsedDocument.model_validate_json(parsed.model_dump_json())
        self.assertEqual(decoded, parsed)
        serialized = parsed.model_dump_json()
        self.assertNotIn(str(self.root), serialized)
        self.assertNotIn("http://", serialized)
        self.assertEqual(set(parsed.model_dump()), {"format", "sections", "metadata"})

    def test_uppercase_extension(self):
        self.document({"Contents/section0.xml": section(paragraph("a"))})
        upper = self.path.with_suffix(".HWPX")
        self.path.rename(upper)
        self.assertEqual(self.parser.parse(upper).format, DocumentFormat.HWPX)


if __name__ == "__main__":
    unittest.main()
