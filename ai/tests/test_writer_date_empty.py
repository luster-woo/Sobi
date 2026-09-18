from datetime import date, datetime
import unittest
import zipfile

import test_document_writer as fixtures
from app.agent.documents.writer.hwpx import parse_date
from app.agent.documents.writer import DocumentWriteError


class EmptyDateTests(unittest.TestCase):
    def setUp(self):
        self.fx = fixtures.WriterTests()
        self.fx.setUp()
        self.addCleanup(self.fx.doCleanups)

    def test_python_date(self):
        self.fx.write(self.fx.resolved(value_type='DATE', value=date(1999, 1, 23)))
        self.assertEqual(self.fx.output_texts(), ['1999-01-23'])

    def test_iso_string(self):
        self.fx.write(self.fx.resolved(value_type='DATE', value='1999-01-23'))
        self.assertEqual(self.fx.output_texts(), ['1999-01-23'])

    def test_invalid_date(self):
        for value in ('1999-02-29', '1999-1-23', '19990123', '1999-01-23T00:00:00',
                      ' 1999-01-23', '1999년 01월 23일', '', None, 19990123):
            with self.subTest(value=value):
                self.fx.assert_error('INVALID_DATE_VALUE', self.fx.resolved(value_type='DATE', value=value))

    def test_shared_parser_rejects_datetime(self):
        with self.assertRaises(DocumentWriteError) as caught:
            parse_date(datetime(1999, 1, 23))
        self.assertEqual(caught.exception.code, 'INVALID_DATE_VALUE')

    def test_stale_guard(self):
        field = self.fx.resolved(value_type='DATE', value='1999-01-23')
        field.location_info['current_text'] = 'changed'
        self.fx.assert_error('TARGET_CONTENT_MISMATCH', field)

    def test_readonly_zip_and_reparse(self):
        original = self.fx.source.read_bytes()
        self.fx.write(self.fx.resolved(value_type='DATE', value=date(2000, 2, 29)))
        self.assertEqual(self.fx.source.read_bytes(), original)
        with zipfile.ZipFile(self.fx.output) as archive:
            self.assertIsNone(archive.testzip())
        self.assertEqual(self.fx.output_texts(), ['2000-02-29'])

    def test_user_input_date_left_blank(self):
        field = self.fx.resolved(value_type='DATE', field_type='USER_INPUT',
                                 runtime_status='LEFT_BLANK', value=None)
        result = self.fx.write(field)
        self.assertEqual(result.written_count, 0)
        self.assertEqual(result.skipped_count, 1)
        self.assertEqual(self.fx.output_texts(), [''])

    def test_date_helper_and_unit_still_unsupported(self):
        from test_document_parser import cell
        for kind, text in (('helper', '(안내)'), ('unit_suffix', '일')):
            self.fx.document([cell(text)])
            self.fx.assert_error('VALUE_TYPE_UNSUPPORTED',
                                 self.fx.resolved(value_type='DATE', value='1999-01-23', kind=kind))
