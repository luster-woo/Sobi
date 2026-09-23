from datetime import date
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
import zipfile

import test_document_writer as fixtures
from test_document_runtime import template, field, source
from test_document_parser import cell
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.parser import HwpxParser
from app.agent.documents.schema_persistence.models import StoredLocationInfo
from app.agent.documents.runtime import DocumentAgentRuntime
from app.agent.documents.drafts import DraftGenerationService, DraftRequest
from app.agent.documents.drafts.errors import DraftError
from app.agent.documents.drafts.settings import DraftSettings
from app.agent.documents.writer.hwpx import cells
from app.agent.documents.writer.inline import paragraph_map
from app.agent.sources.service import SourceService
from app.agent.sources.provider import SourceData


class DraftE2ETests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.fx=fixtures.WriterTests(); self.fx.setUp(); self.addCleanup(self.fx.doCleanups)
        self.facts={'USER_NAME':'테스트 대표','USER_EMAIL':'test2@test.com','USER_BIRTH_DATE':date(1999,1,23),
            'BUSINESS_NAME':'즐거운 카페','BUSINESS_BRN':'9876543210','BUSINESS_CATEGORY':'한식음식점',
            'BUSINESS_ADDRESS':'테스트 주소','OPEN_DATE':date(2023,5,15),'EMPLOYEE_COUNT':3}
        self.gms=SimpleNamespace(generate=AsyncMock(return_value=json.dumps({
            'status':'GENERATED','content':'즐거운 카페 소개입니다.','missing_information':[]})))
        self.sources=SourceService(SimpleNamespace(fetch=AsyncMock(return_value=SourceData(values=self.facts))),
                                   today=lambda:date(2026,9,18))

    def service(self, fields):
        loaded=template(*fields); loaded.normalized_path=str(self.fx.source)
        return DraftGenerationService(settings=DraftSettings(self.fx.root/'generated'),
            repository=SimpleNamespace(load=AsyncMock(return_value=loaded)),
            runtime_factory=lambda repository:DocumentAgentRuntime(repository=repository,
                source_resolver=self.sources,gms_client=self.gms))

    async def test_real_card_draft(self):
        self.fx.source.write_bytes((Path(__file__).parent/'fixtures/writer/card_blank.hwpx').read_bytes())
        original=self.fx.source.read_bytes()
        parsed=HwpxParser().parse(self.fx.source)
        candidates=FieldCandidateExtractor().extract(parsed)
        mapping={'업체명':('BUSINESS_NAME','BUSINESS','TEXT'),'대표자':('USER_NAME','USER','TEXT'),
            '성명':('USER_NAME','USER','TEXT'),'생년월일':('USER_BIRTH_DATE','USER','DATE'),
            'E-mail':('USER_EMAIL','USER','TEXT'),'사업자등록번호':('BUSINESS_BRN','BUSINESS','TEXT'),
            '업종':('BUSINESS_CATEGORY','BUSINESS','TEXT'),'주소':('BUSINESS_ADDRESS','BUSINESS','TEXT'),
            '개업일':('OPEN_DATE','BUSINESS','DATE'),'현)상시근로자':('EMPLOYEE_COUNT','BUSINESS','NUMBER')}
        fields=[]
        for i,c in enumerate(candidates):
            info=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,
                input_shape=c.input_shape,hints=c.hints).model_dump(mode='json')
            if c.normalized_label in mapping:
                key,kind,type_=mapping[c.normalized_label]
                f=field(key=f'{key.lower()}_{i}',id=i+1,order=i,value_type=type_,sources=[source(key,kind)])
            elif c.normalized_label in {'동의','미동의'}:
                f=field(key=f'choice_{i}',id=i+1,order=i,type='USER_INPUT',value_type='BOOLEAN',sources=[])
            else:
                f=field(key=f'revenue_{i}',id=i+1,order=i,status='UNSUPPORTED',required=False,sources=[])
            f.location_info=info
            fields.append(f)
        service=self.service(fields)
        response=await service.generate(DraftRequest(templateId=1,userId=9))
        self.assertEqual((response.written_field_count,response.left_blank_field_count,response.unsupported_field_count),(14,4,2))
        record=service.store.get(response.draft_id)
        path=service.settings.download_path(record)
        output=HwpxParser().parse(path)
        texts=[p.text for p in paragraph_map(output).values() if p]
        self.assertEqual(sum('즐거운 카페' in t for t in texts),3)
        self.assertEqual(sum('테스트 대표' in t for t in texts),4)
        self.assertIn('1999-01-23',texts); self.assertIn('test2@test.com',texts)
        self.assertTrue(any('2023년 05월 15일' in t for t in texts))
        self.assertTrue(any('3명' in t for t in texts))
        self.assertTrue(any('테스트 대표(인)' in t for t in texts))
        self.assertTrue(any('테스트 대표(서명/인)' in t for t in texts))
        original_cells=cells(parsed); written_cells=cells(output)
        for f in fields:
            if f.field_type=='USER_INPUT':
                native=f.location_info['target_location']['native_ref']
                key=(native['section_file'],tuple(native['element_path']))
                self.assertEqual(original_cells[key].text,written_cells[key].text)
        with zipfile.ZipFile(path) as archive:self.assertIsNone(archive.testzip())
        self.assertEqual(self.fx.source.read_bytes(),original)
        self.gms.generate.assert_not_called()
        self.assertNotIn('test2@test.com',response.model_dump_json())

    async def test_computed_and_generated_via_existing_runtime(self):
        self.fx.document([cell(''),cell('')])
        fields=[field(key='age',type='COMPUTED',value_type='NUMBER',sources=[source('BUSINESS_AGE_MONTHS')]),
                field(key='intro',id=2,order=1,type='GENERATED',sources=[source('BUSINESS_NAME')])]
        for index,f in enumerate(fields):
            f.location_info=self.fx.resolved(index=index).location_info
        service=self.service(fields)
        result=await service.generate(DraftRequest(templateId=1,userId=9))
        parsed=HwpxParser().parse(service.store.get(result.draft_id).generated_file_path)
        self.assertEqual([c.text for c in cells(parsed).values()],['40','즐거운 카페 소개입니다.'])
        self.gms.generate.assert_awaited_once()

    async def test_required_scoped_rag_remains_unsupported(self):
        f=field(type='GENERATED',sources=[source('PROGRAM_RAG','RAG')])
        service=self.service([f])
        with self.assertRaises(DraftError) as caught:
            await service.generate(DraftRequest(templateId=1,userId=9))
        self.assertEqual(caught.exception.code,'DRAFT_NOT_READY')
        self.assertEqual(caught.exception.details[0]['status'],'UNSUPPORTED')
        self.gms.generate.assert_not_called()
        self.assertFalse((self.fx.root/'generated').exists())
