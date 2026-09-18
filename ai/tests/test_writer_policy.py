import copy
from datetime import date
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
from xml.dom import minidom
import zipfile
import test_document_writer as fixtures
from app.agent.documents.writer import HwpxWriter
from app.agent.documents.writer.hwpx import cells, resolve
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.schema_persistence.models import StoredLocationInfo
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest
from app.agent.documents.runtime.models import RuntimeFieldSchema
from app.agent.sources.service import SourceService
from app.agent.sources.provider import SourceData
from test_document_runtime import template


class DatePlaceholderTests(unittest.TestCase):
    def setUp(self):
        self.fx=fixtures.WriterTests();self.fx.setUp();self.addCleanup(self.fx.doCleanups)
    def prepare(self,helper=True,value='2022-03-15',runs=None):
        from test_document_parser import cell,paragraph
        content=paragraph('년    월    일',runs=runs)
        if helper:content+=paragraph('(사업자등록증 상)')
        self.fx.document([cell(paragraphs=content)])
        f=self.fx.resolved(kind='placeholder',value_type='DATE',value=value)
        f.location_info['hints']['placeholder_text']='년    월    일'
        if helper:f.location_info['hints']['helper_text']='(사업자등록증 상)'
        return f
    def test_iso_with_helper(self):
        self.fx.write(self.prepare());self.assertEqual(self.fx.output_texts(),['2022년 03월 15일\n(사업자등록증 상)'])
    def test_python_date(self):
        self.fx.write(self.prepare(value=date(2022,3,15)));self.assertEqual(self.fx.output_texts(),['2022년 03월 15일\n(사업자등록증 상)'])
    def test_without_helper(self):
        self.fx.write(self.prepare(helper=False));self.assertEqual(self.fx.output_texts(),['2022년 03월 15일'])
    def test_multiple_date_runs(self):
        self.fx.write(self.prepare(runs=['년','    월','    일']));self.assertEqual(self.fx.output_texts(),['2022년 03월 15일\n(사업자등록증 상)'])
    def test_stale(self):
        f=self.prepare();f.location_info['current_text']='wrong';self.fx.assert_error('TARGET_CONTENT_MISMATCH',f)
    def test_missing_placeholder(self):
        f=self.prepare();del f.location_info['hints']['placeholder_text'];self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',f)
    def test_invalid_date(self):
        for v in ['2022-02-30','20220315','22-03-15','2022-03-15T00:00:00',None]:
            with self.subTest(value=v):self.fx.assert_error('INVALID_DATE_VALUE',self.prepare(value=v))
    def test_wrong_placeholder_type(self):
        f=self.prepare();f.value_type='TEXT';self.fx.assert_error('VALUE_TYPE_UNSUPPORTED',f)
    def test_unrecognized_date_pattern(self):
        f=self.prepare();f.location_info['hints']['placeholder_text']='YYYY-MM-DD';self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',f)
    def test_helper_mismatch(self):
        f=self.prepare();f.location_info['hints']['helper_text']='wrong';self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',f)
    def test_inline_helper_not_flattened(self):
        from test_document_parser import cell,paragraph
        f=self.prepare();self.fx.document([cell(paragraphs=paragraph('년    월    일\n(사업자등록증 상)'))])
        # Same logical text but no standalone date paragraph: unsupported instead of rewriting helper.
        self.fx.assert_error('DATE_PLACEHOLDER_UNSUPPORTED',f)
    def test_blank_boolean_no_preflight(self):
        f=self.fx.resolved(field_type='USER_INPUT',runtime_status='LEFT_BLANK',value=None,value_type='BOOLEAN',location_info={})
        result=self.fx.write(f);self.assertEqual(result.skipped_count,1);self.assertEqual(self.fx.output_texts(),[''])
    def test_blank_date_no_preflight(self):
        f=self.fx.resolved(field_type='USER_INPUT',runtime_status='LEFT_BLANK',value=None,value_type='DATE',location_info={'hints':{'target_kind':'unsupported'}})
        result=self.fx.write(f);self.assertEqual(result.skipped_count,1)


class RealCardFixtureTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_card_runtime_writer_round_trip(self):
        fx=fixtures.WriterTests();fx.setUp();self.addCleanup(fx.doCleanups)
        fixture=Path(__file__).parent/'fixtures/writer/card_blank.hwpx'
        fx.source.write_bytes(fixture.read_bytes())
        original=fx.source.read_bytes()
        parsed=HwpxParser().parse(fx.source)
        candidates=[c for c in FieldCandidateExtractor().extract(parsed) if c.target_location.type == "TABLE_CELL"]
        self.assertEqual(len(candidates),16)
        # Mapping comes from the user's reviewed schema, never inferred by Writer.
        specs=[('business_name','BUSINESS','BUSINESS_NAME','TEXT'),('representative_name','USER','USER_NAME','TEXT'),
               ('business_brn','BUSINESS','BUSINESS_BRN','TEXT'),('business_category','BUSINESS','BUSINESS_CATEGORY','TEXT'),
               ('business_address','BUSINESS','BUSINESS_ADDRESS','TEXT'),('open_date','BUSINESS','OPEN_DATE','DATE'),
               ('employee_count','BUSINESS','EMPLOYEE_COUNT','NUMBER'),('representative_name_2','USER','USER_NAME','TEXT'),
               ('birth_date',None,None,'DATE'),('user_email','USER','USER_EMAIL','TEXT'),
               ('reported_revenue_2025','UNSUPPORTED',None,'NUMBER'),('card_revenue_2025','UNSUPPORTED',None,'NUMBER'),
               ('consent',None,None,'BOOLEAN'),('disagree',None,None,'BOOLEAN'),('consent_2',None,None,'BOOLEAN'),('disagree_2',None,None,'BOOLEAN')]
        fields=[]
        for i,(c,(key,kind,source_key,value_type)) in enumerate(zip(candidates,specs)):
            info=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,input_shape=c.input_shape,hints=c.hints)
            fields.append(RuntimeFieldSchema(id=i+1,field_key=key,field_label=c.label,field_order=i,field_type='USER_INPUT' if kind is None else 'DIRECT',
                value_type=value_type,mapping_status='UNSUPPORTED' if kind=='UNSUPPORTED' else 'RESOLVED',required=kind!='UNSUPPORTED',
                sources=[] if source_key is None else [dict(id=i+1,source_type=kind,source_key=source_key,priority=1,required=True)],location_info=info.model_dump(mode='json')))
        facts={'BUSINESS_NAME':'테스트 업체','USER_NAME':'테스트 대표','BUSINESS_BRN':'0000000000','BUSINESS_CATEGORY':'테스트 업종',
               'BUSINESS_ADDRESS':'테스트 주소','OPEN_DATE':date(2022,3,15),'EMPLOYEE_COUNT':5,'USER_EMAIL':'example@example.com'}
        provider=SimpleNamespace(fetch=AsyncMock(return_value=SourceData(values=facts)))
        gms=SimpleNamespace(generate=AsyncMock(side_effect=AssertionError('no GMS')))
        runtime=DocumentAgentRuntime(repository=SimpleNamespace(load=AsyncMock(return_value=template(*fields))),source_resolver=SourceService(provider),gms_client=gms)
        result=await runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
        self.assertTrue(result.ready_for_write)
        for status,count in [('RESOLVED',9),('LEFT_BLANK',5),('UNSUPPORTED',2)]:self.assertEqual(result.status_counts[status],count)
        self.assertEqual(provider.fetch.await_count,9);gms.generate.assert_not_called()
        written=HwpxWriter().write(source_path=fx.source,runtime_result=result,output_path=fx.output)
        self.assertEqual((written.written_count,written.skipped_count),(9,7))
        after=cells(HwpxParser().parse(fx.output));before=cells(parsed)
        expected_values={'business_name':'테스트 업체','representative_name':'테스트 대표',
            'business_brn':'0000000000','business_category':'테스트 업종\n(사업자등록증 상)',
            'business_address':'테스트 주소','open_date':'2022년 03월 15일\n(사업자등록증 상)',
            'employee_count':'5명','representative_name_2':'테스트 대표','user_email':'example@example.com'}
        for f in result.fields:
            if f.field_key in expected_values:
                n=f.location_info['target_location']['native_ref']
                self.assertEqual(after[(n['section_file'],tuple(n['element_path']))].text,expected_values[f.field_key])
        with zipfile.ZipFile(fx.source) as a,zipfile.ZipFile(fx.output) as b:
            old=minidom.parseString(a.read('Contents/section0.xml'));new=minidom.parseString(b.read('Contents/section0.xml'))
            self.assertIsNone(b.testzip())
            auto_keys=set()
            for f in result.fields:
                n=f.location_info['target_location']['native_ref'];key=(n['section_file'],tuple(n['element_path']))
                if f.runtime_status=='RESOLVED':auto_keys.add(key)
                else:self.assertIsNone(f.value)
                if f.field_key=='open_date':
                    self.assertEqual(after[key].text,'2022년 03월 15일\n(사업자등록증 상)')
                    old_tc=resolve(old.documentElement,list(key[1]));new_tc=resolve(new.documentElement,list(key[1]))
                    self.assertEqual(old_tc.getElementsByTagName('hp:p')[1].toxml(),new_tc.getElementsByTagName('hp:p')[1].toxml())
            # All non-target cells, including both consent tables/selection states, are XML-identical.
            for key,cell in before.items():
                if key not in auto_keys:
                    self.assertEqual(after[key].text,cell.text)
                    self.assertEqual(resolve(old.documentElement,list(key[1])).toxml(),resolve(new.documentElement,list(key[1])).toxml())
            old.unlink();new.unlink()
        self.assertEqual(original,fx.source.read_bytes())
