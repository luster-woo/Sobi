"""Safe multi-paragraph empty cells; no DB, converters or GMS."""
import unittest
from unittest.mock import patch
from xml.dom import minidom
import zipfile

import test_document_writer as fixtures
from test_document_parser import cell, paragraph, table
from app.agent.documents.writer.hwpx import elements, mutate, preflight, cells
from app.agent.documents.parser import HwpxParser


class MultiEmptyTests(unittest.TestCase):
    def setUp(self):
        self.fx = fixtures.WriterTests()
        self.fx.setUp()
        self.addCleanup(self.fx.doCleanups)

    def document(self, paragraphs):
        self.fx.document([cell(paragraphs=paragraphs)])

    def dom(self, path):
        with zipfile.ZipFile(path) as archive:
            self.assertIsNone(archive.testzip())
            doc = minidom.parseString(archive.read('Contents/section0.xml'))
        self.addCleanup(doc.unlink)
        return doc

    def paragraphs(self, doc):
        tc = doc.getElementsByTagName('hp:tc')[0]
        sublist = next(n for n in elements(tc) if n.localName == 'subList')
        return elements(sublist)

    def test_single_blank_regression(self):
        self.document(paragraph(' '))
        self.fx.write()
        self.assertEqual(self.fx.output_texts(), ['성현상사'])

    def test_two_blank_paragraphs_preserve_trailing_whitespace(self):
        self.document(paragraph('  ') + paragraph(' \t'))
        self.fx.write()
        self.assertEqual(self.fx.output_texts(), ['성현상사\n \t'])

    def test_nine_paragraph_generated_regression(self):
        self.document(paragraph('') * 8 + paragraph(' '))
        self.assertEqual(self.fx.parsed_cells[0].text, '\n' * 8 + ' ')
        text = '테스트상사는 김천시에서 소매업을 운영하고 있으며, 점포 환경 개선을 통해 고객 편의를 높이고자 합니다.'
        field = self.fx.resolved(value=text, field_type='GENERATED')
        field.location_info['input_shape'] = 'LONG_TEXT'
        self.assertIsNone(field.location_info['target_location']['paragraph_index'])
        before = self.fx.source.read_bytes()
        result = self.fx.write(field)
        self.assertEqual(result.written_count, 1)
        self.assertEqual(self.fx.output_texts(), [text + '\n' * 8 + ' '])
        self.assertEqual(self.fx.source.read_bytes(), before)
        old, new = self.paragraphs(self.dom(self.fx.source)), self.paragraphs(self.dom(self.fx.output))
        self.assertEqual(len(new), 9)
        self.assertEqual([p.toxml() for p in old[1:]], [p.toxml() for p in new[1:]])

    def test_run_style_attributes_and_unchanged_paragraph_xml_preserved(self):
        p = ('<hp:p id="17" paraPrIDRef="2" styleIDRef="3">'
             '<hp:run charPrIDRef="4"><hp:t> </hp:t></hp:run>'
             '<hp:run charPrIDRef="5"><hp:t><hp:tab/> </hp:t></hp:run>'
             '<hp:linesegarray><hp:lineseg textpos="0"/></hp:linesegarray></hp:p>')
        self.document(p * 3)
        before = self.paragraphs(self.dom(self.fx.source))
        self.fx.write()
        after = self.paragraphs(self.dom(self.fx.output))
        self.assertEqual(len(after), len(before))
        self.assertEqual([p.toxml() for p in after[1:]], [p.toxml() for p in before[1:]])
        self.assertEqual(dict(after[0].attributes.items()), dict(before[0].attributes.items()))
        self.assertEqual([dict(n.attributes.items()) for n in elements(after[0])],
                         [dict(n.attributes.items()) for n in elements(before[0]) if n.localName == 'run'])
        self.assertFalse(after[0].getElementsByTagName('hp:linesegarray'))
        self.assertEqual(after[0].getElementsByTagName('hp:t')[0].firstChild.data, '성현상사')

    def test_multiline_uses_line_breaks_and_exact_expected(self):
        self.document(paragraph(' ') + paragraph('') + paragraph(' '))
        field = self.fx.resolved(value='첫 줄\n둘째 줄\n', field_type='GENERATED')
        doc = self.dom(self.fx.source)
        plan = preflight(field, {'Contents/section0.xml': doc}, cells(HwpxParser().parse(self.fx.source)))
        self.assertEqual(plan.expected, '첫 줄\n둘째 줄\n\n\n ')
        self.fx.write(field)
        self.assertEqual(self.fx.output_texts(), [plan.expected])
        self.assertEqual(len(self.paragraphs(self.dom(self.fx.output))[0].getElementsByTagName('hp:lineBreak')), 2)

    def test_blank_text_controls_in_later_paragraph_preserved(self):
        trailing = '<hp:p><hp:run><hp:t><hp:lineBreak/><hp:tab/><hp:nbSpace/><hp:fwSpace/></hp:t></hp:run></hp:p>'
        self.document(paragraph('') + trailing)
        tail = self.fx.parsed_cells[0].paragraphs[1].text
        self.fx.write()
        self.assertEqual(self.fx.output_texts(), ['성현상사\n' + tail])

    def test_nonblank_later_paragraph_rejected(self):
        self.document(paragraph('') + paragraph('사용자 문구'))
        self.fx.assert_error('TARGET_CONTENT_MISMATCH')

    def test_nested_table_rejected(self):
        self.document(paragraph('') + '<hp:p><hp:run>' + table([cell('')]) + '</hp:run></hp:p>')
        self.fx.assert_error('TARGET_STRUCTURE_UNSUPPORTED')

    def test_unsupported_controls_objects_markers_and_namespace_rejected(self):
        for node in ('<hp:ctrl/>', '<hp:pic/>', '<hp:rangeTag/>', '<hp:unknown/>',
                     '<other:t xmlns:other="urn:other"/>'):
            with self.subTest(node=node):
                self.document(paragraph('') + '<hp:p><hp:run>' + node + '</hp:run></hp:p>')
                self.fx.assert_error('TARGET_STRUCTURE_UNSUPPORTED')

    def test_marker_inside_text_rejected(self):
        self.document(paragraph('') + '<hp:p><hp:run><hp:t><hp:markpenBegin/></hp:t></hp:run></hp:p>')
        self.fx.assert_error('TARGET_STRUCTURE_UNSUPPORTED')

    def test_missing_first_run_rejected(self):
        self.document('<hp:p/>' + paragraph(''))
        self.fx.assert_error('TARGET_STRUCTURE_UNSUPPORTED')

    def test_stale_current_text_rejected(self):
        self.document(paragraph('') * 9)
        field = self.fx.resolved()
        field.location_info['current_text'] = ''
        self.fx.assert_error('TARGET_CONTENT_MISMATCH', field)

    def test_reparse_verification_rejects_corrupted_trailing_text(self):
        self.document(paragraph('') + paragraph(' '))
        def corrupt(plan):
            mutate(plan)
            t = plan.paragraphs[1].getElementsByTagName('hp:t')[0]
            t.appendChild(t.ownerDocument.createTextNode('unexpected'))
        with patch('app.agent.documents.writer.hwpx.mutate', side_effect=corrupt):
            self.fx.assert_error('OUTPUT_VALIDATION_FAILED')
        self.assertEqual(self.fx.source.read_bytes(), self.fx.original)
