from datetime import date, datetime, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import test_document_writer as fixtures
from test_document_parser import cell, paragraph
from test_document_runtime import field, template, source
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.candidates.inline import inline_regions
from app.agent.documents.writer.inline import paragraph_map
from app.agent.documents.schema_persistence.models import StoredLocationInfo
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest
from app.agent.sources.service import SourceService
from app.agent.sources.models import SourceResolveContext, SourceResolveRequest
from app.agent.sources.errors import SourceError

class DateInlineTests(unittest.TestCase):
    def setUp(self):
        self.fx = fixtures.WriterTests(); self.fx.setUp(); self.addCleanup(self.fx.doCleanups)

    def prepare(self, text='  2026년     월     일 ', runs=None):
        self.fx.document([cell(paragraphs=paragraph(text, runs=runs))])
        candidates = FieldCandidateExtractor().extract(HwpxParser().parse(self.fx.source))
        fields = []
        for i,c in enumerate(candidates):
            if c.target_location.type != 'PARAGRAPH_INLINE': continue
            info = StoredLocationInfo(target_location=c.target_location, current_text=c.current_text,
                input_shape=c.input_shape, hints=c.hints).model_dump(mode='json')
            fields.append(self.fx.resolved(field_key=f'part_{i}',field_schema_id=i+1,
                value_type='DATE', value=date(2026,9,21),location_info=info))
        return fields

    def test_single_parenthesized_label(self):
        fields=self.prepare('신청인(대표자) :                (서명, 인)')
        self.assertEqual(len(fields),1)
        fields[0].value_type='TEXT'; fields[0].value='테스트 대표'
        self.fx.write(*fields)
        texts=[p.text for p in paragraph_map(HwpxParser().parse(self.fx.output)).values() if p]
        self.assertIn('신청인(대표자) :테스트 대표(서명, 인)',texts)

    def test_month_day_split_runs(self):
        fields=self.prepare(runs=['  2026년  ','   월  ','   일 '])
        self.assertEqual(len(fields),2)
        original=self.fx.source.read_bytes(); self.fx.write(*reversed(fields))
        self.assertEqual(original,self.fx.source.read_bytes())
        texts=[p.text for p in paragraph_map(HwpxParser().parse(self.fx.output)).values() if p]
        self.assertIn('  2026년 9월 21일 ',texts)

    def test_year_mismatch(self):
        fields=self.prepare(); fields[0].value=date(2027,1,1)
        self.fx.assert_error('DATE_YEAR_MISMATCH',*fields)

    def test_tampered_date_part(self):
        fields=self.prepare(); fields[0].location_info['hints']['date_part']='day'
        self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',*fields)

    def test_tampered_fixed_year(self):
        fields=self.prepare(); fields[0].location_info['hints']['fixed_year']=2027
        self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',*fields)

    def test_populated_date_not_candidate(self):
        self.assertEqual(list(inline_regions('2026년 9월 21일')),[])

    def test_prose_and_partial_date_not_candidate(self):
        for text in ['작성일은 2026년     월     일 입니다.', '2026년 9월     일', '이름 : 값 (인)']:
            self.assertEqual(list(inline_regions(text)),[])

class DraftDateSourceTests(unittest.IsolatedAsyncioTestCase):
    async def test_context_date_no_database(self):
        provider=SimpleNamespace(fetch=AsyncMock(side_effect=AssertionError('DB forbidden')))
        service=SourceService(provider)
        request=SourceResolveRequest(source_type='PROGRAM',source_key='PROGRAM_DRAFT_DATE')
        result=await service.resolve_source(SourceResolveContext(draft_date=date(2026,9,21)),request)
        self.assertEqual(result.value,date(2026,9,21)); provider.fetch.assert_not_called()

    async def test_missing_context_date_rejected(self):
        with self.assertRaises(SourceError) as caught:
            await SourceService(None).resolve_source(SourceResolveContext(),
                SourceResolveRequest(source_type='PROGRAM',source_key='PROGRAM_DRAFT_DATE'))
        self.assertEqual(caught.exception.code,'DRAFT_DATE_REQUIRED')

    async def test_runtime_snapshot_korea_midnight(self):
        fields=[field(key=f'date_{i}',id=i+1,order=i,value_type='DATE',
            sources=[source(key='PROGRAM_DRAFT_DATE',type='PROGRAM')]) for i in range(2)]
        runtime=DocumentAgentRuntime(repository=SimpleNamespace(load=AsyncMock(return_value=template(*fields))),
            source_resolver=SourceService(None))
        with patch('app.agent.documents.runtime.service.datetime') as clock:
            clock.now.side_effect=lambda tz: datetime(2026,9,20,15,1,tzinfo=timezone.utc).astimezone(tz)
            result=await runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=1))
            clock.now.assert_called_once()
        self.assertEqual([f.value for f in result.fields],[date(2026,9,21)]*2)
