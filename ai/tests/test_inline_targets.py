import copy
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
from xml.dom import minidom
import zipfile
import test_document_writer as fixtures
from test_document_parser import paragraph,cell
from test_document_runtime import template,field,source,value
from test_schema_analyzer import FakeClient,response,field as analysis_field,source as analysis_source
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.schema_persistence.models import StoredLocationInfo
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer
from app.agent.documents.runtime import DocumentAgentRuntime,DocumentRuntimeRequest
from app.agent.documents.runtime.models import RuntimeFieldSchema
from app.agent.documents.writer import DocumentWriteError,HwpxWriter
from app.agent.documents.writer.inline import paragraph_map
from app.agent.documents.writer.hwpx import resolve,cells

FIRST='업 체 명 :                    대표자 :                (인)'
SECOND='업체명 :                          성  명 :                 (서명/인)'

class InlineCandidateTests(unittest.TestCase):
    def setUp(self):
        self.fx=fixtures.WriterTests();self.fx.setUp();self.addCleanup(self.fx.doCleanups)
    def extract(self,text=FIRST,runs=None):
        self.fx.document([cell(paragraphs=paragraph(text,runs=runs))])
        self.parsed=HwpxParser().parse(self.fx.source)
        return [c for c in FieldCandidateExtractor().extract(self.parsed) if c.hints['target_kind']=='inline_blank']
    def test_first_labels(self):self.assertEqual([c.label for c in self.extract()],['업 체 명','대표자'])
    def test_second_labels(self):self.assertEqual([c.label for c in self.extract(SECOND)],['업체명','성  명'])
    def test_distinct_ids_and_ranges(self):
        cs=self.extract();self.assertNotEqual(cs[0].candidate_id,cs[1].candidate_id);self.assertNotEqual(cs[0].target_location,cs[1].target_location)
    def test_exact_space_and_guards(self):
        for c in self.extract():
            r=c.target_location.native_ref['inline_range'];self.assertEqual(r['paragraph_text'],FIRST);self.assertEqual(c.current_text,FIRST[r['start']:r['end']]);self.assertTrue(c.current_text.isspace())
    def test_fixed_suffix_not_candidate(self):
        cs=self.extract(SECOND);self.assertEqual(len(cs),2);self.assertTrue(all('서명' not in c.label for c in cs))
    def test_normal_prose_not_candidate(self):self.assertEqual(self.extract('일반 문장의    공백은       입력란이 아닙니다.'),[])
    def test_short_space_not_candidate(self):self.assertEqual(self.extract('이름 :  담당자 :  (확인)'),[])
    def test_no_colon_not_candidate(self):self.assertEqual(self.extract('이름       담당자       (확인)'),[])
    def test_no_suffix_not_candidate(self):self.assertEqual(self.extract('이름 :      담당자 :      문장입니다.'),[])
    def test_already_filled_not_candidate(self):self.assertEqual(self.extract('이름 : 홍길동    담당자 :      (인)'),[])
    def test_spanning_runs(self):self.assertEqual(len(self.extract(runs=['업 체 명 :    ','                대표자 :                (인)'])),2)
    def test_generic_labels(self):self.assertEqual([c.label for c in self.extract('접수부서 :       담당자명 :       (확인)')],['접수부서','담당자명'])
    def test_input_not_mutated(self):
        self.extract();before=self.parsed.model_dump();FieldCandidateExtractor().extract(self.parsed);self.assertEqual(before,self.parsed.model_dump())
    def test_real_fixture_twenty(self):
        p=Path(__file__).parent/'fixtures/writer/card_blank.hwpx';cs=FieldCandidateExtractor().extract(HwpxParser().parse(p))
        self.assertEqual(len(cs),24);self.assertEqual(sum(c.target_location.type=='TABLE_CELL' for c in cs),16)

class InlineWriterTests(unittest.TestCase):
    def setUp(self):
        self.fx=fixtures.WriterTests();self.fx.setUp();self.addCleanup(self.fx.doCleanups)
        self.fx.document([cell(paragraphs=paragraph(FIRST))]);self.candidates=FieldCandidateExtractor().extract(HwpxParser().parse(self.fx.source))
        self.candidates=[c for c in self.candidates if c.target_location.type=='PARAGRAPH_INLINE']
    def fields(self):
        fields=[]
        for i,c in enumerate(self.candidates):
            info=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,input_shape=c.input_shape,hints=c.hints)
            fields.append(self.fx.resolved(value=['매우 긴 테스트 업체명','홍길동'][i],field_key=f'inline_{i}',field_schema_id=i+1,location_info=info.model_dump(mode='json')))
        return fields
    def text(self):return next(p.text for p in paragraph_map(HwpxParser().parse(self.fx.output)).values() if p and '업 체 명' in p.text)
    def test_two_edits_reverse_offsets(self):
        fs=self.fields();self.fx.write(*fs);self.assertEqual(self.text(),'업 체 명 :매우 긴 테스트 업체명대표자 :홍길동(인)')
    def test_field_order_independent(self):
        self.fx.write(*reversed(self.fields()));self.assertIn('대표자 :홍길동(인)',self.text())
    def test_original_unchanged_zip_valid(self):
        before=self.fx.source.read_bytes();self.fx.write(*self.fields());self.assertEqual(before,self.fx.source.read_bytes())
        with zipfile.ZipFile(self.fx.output) as z:self.assertIsNone(z.testzip())
    def test_blank_stale(self):
        fs=self.fields();fs[0].location_info['current_text']=' ';self.fx.assert_error('TARGET_CONTENT_MISMATCH',*fs)
    def test_paragraph_stale(self):
        fs=self.fields();fs[0].location_info['target_location']['native_ref']['inline_range']['paragraph_text']=FIRST.replace('대표자','작성자');self.fx.assert_error('TARGET_CONTENT_MISMATCH',*fs)
    def test_missing_path(self):
        fs=self.fields();fs[0].location_info['target_location']['native_ref']['element_path']=[999];self.fx.assert_error('TARGET_PATH_NOT_FOUND',*fs)
    def test_number_rejected(self):
        fs=self.fields();fs[0].value_type='NUMBER';fs[0].value=5;self.fx.assert_error('VALUE_TYPE_UNSUPPORTED',*fs)
    def test_multiline_rejected(self):
        fs=self.fields();fs[0].value='first\nsecond';self.fx.assert_error('INLINE_MULTILINE_UNSUPPORTED',*fs)
    def test_left_blank_preserved(self):
        fs=self.fields();fs[1].field_type='USER_INPUT';fs[1].runtime_status='LEFT_BLANK';fs[1].value=None
        self.fx.write(*fs);self.assertIn('대표자 :                (인)',self.text())
    def test_optional_unsupported_preserved(self):
        fs=self.fields();fs[1].runtime_status='UNSUPPORTED';fs[1].required=False
        self.fx.write(*fs);self.assertIn('대표자 :                (인)',self.text())
    def test_duplicate_range_rejected(self):
        f=self.fields()[0];self.fx.assert_error('DUPLICATE_TARGET',f,f)
    def test_overlapping_range_rejected(self):
        fs=self.fields();other=fs[0].model_copy(deep=True);r=other.location_info['target_location']['native_ref']['inline_range'];r['start']+=1;other.location_info['current_text']=other.location_info['current_text'][1:];self.fx.assert_error('DUPLICATE_TARGET',fs[0],other)
    def test_invalid_range(self):
        fs=self.fields();fs[0].location_info['target_location']['native_ref']['inline_range']['start']=-1;self.fx.assert_error('INLINE_RANGE_INVALID',*fs)

class InlineRealE2ETests(unittest.IsolatedAsyncioTestCase):
    async def test_real_analyzer_adapter_runtime_writer(self):
        fx=fixtures.WriterTests();fx.setUp();self.addCleanup(fx.doCleanups)
        fx.source.write_bytes((Path(__file__).parent/'fixtures/writer/card_blank.hwpx').read_bytes())
        original=fx.source.read_bytes();parsed=HwpxParser().parse(fx.source)
        all_candidates=FieldCandidateExtractor().extract(parsed)
        selected=all_candidates
        mapping={'업체명':('business_name','BUSINESS_NAME','BUSINESS','TEXT'),
            '대표자':('representative_name','USER_NAME','USER','TEXT'),
            '성명':('representative_name','USER_NAME','USER','TEXT'),
            '사업자등록번호':('business_brn','BUSINESS_BRN','BUSINESS','TEXT'),
            '업종':('business_category','BUSINESS_CATEGORY','BUSINESS','TEXT'),
            '주소':('business_address','BUSINESS_ADDRESS','BUSINESS','TEXT'),
            '개업일':('open_date','OPEN_DATE','BUSINESS','DATE'),
            '현)상시근로자':('employee_count','EMPLOYEE_COUNT','BUSINESS','NUMBER'),
            'E-mail':('user_email','USER_EMAIL','USER','TEXT'),
            '생년월일':('birth_date','USER_BIRTH_DATE','USER','DATE')}
        outputs=[]
        for c in selected:
            if c.normalized_label in mapping:
                key,source_key,kind,value_type=mapping[c.normalized_label]
                outputs.append(analysis_field(cid=c.candidate_id,key=key,value_type=value_type,required=True,sources=[analysis_source(source_key,kind)]))
            elif c.normalized_label in {'동의','미동의'}:
                outputs.append(analysis_field(cid=c.candidate_id,key='consent' if c.normalized_label=='동의' else 'disagree',semantic='USER_INPUT',sources=[],value_type='BOOLEAN',required=True))
            else:
                outputs.append(analysis_field(cid=c.candidate_id,key='revenue',status='UNSUPPORTED',sources=[],value_type='NUMBER',required=False))
        fake=FakeClient(response(*outputs));analyzed=await GmsSchemaAnalyzer(client=fake).analyze(selected)
        self.assertEqual(len({x.analysis.field_key for x in analyzed.fields}),len(selected))
        self.assertEqual(sum(bool(x.analysis.sources) and x.analysis.sources[0].source_key=='BUSINESS_NAME' for x in analyzed.fields),3)
        self.assertEqual(sum(bool(x.analysis.sources) and x.analysis.sources[0].source_key=='USER_NAME' for x in analyzed.fields),4)
        payload=fake.calls[0]['user_payload']
        for forbidden in ['native_ref','element_path','inline_range','target_location','section_file']:self.assertNotIn(forbidden,payload)
        fields=[]
        for i,item in enumerate(analyzed.fields):
            a,c=item.analysis,item.candidate
            info=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,input_shape=c.input_shape,hints=c.hints)
            fields.append(RuntimeFieldSchema(id=i+1,field_key=a.field_key,field_label=c.label,field_order=i,field_type=a.semantic_type,value_type=a.value_type,mapping_status=a.mapping_status,required=a.required,location_info=info.model_dump(mode='json'),sources=[dict(id=i+1,**src.model_dump()) for src in a.sources]))
        async def fetch(kind, context, **kwargs):
            from datetime import date
            from app.agent.sources.provider import SourceData
            self.assertEqual(context.user_id, 9)
            facts={'BUSINESS_NAME':'테스트 업체','USER_NAME':'테스트 대표','BUSINESS_BRN':'0000000000',
                'BUSINESS_CATEGORY':'테스트 업종','BUSINESS_ADDRESS':'테스트 주소','OPEN_DATE':date(2022,3,15),
                'EMPLOYEE_COUNT':5,'USER_EMAIL':'example@example.com','USER_BIRTH_DATE':date(1999,1,23)}
            return SourceData(values=facts)
        from app.agent.sources.service import SourceService
        result=await DocumentAgentRuntime(repository=SimpleNamespace(load=AsyncMock(return_value=template(*fields))),source_resolver=SourceService(SimpleNamespace(fetch=fetch))).resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
        written=HwpxWriter().write(source_path=fx.source,runtime_result=result,output_path=fx.output)
        self.assertEqual(written.written_count,14)
        self.assertEqual(written.skipped_count,10)
        self.assertEqual(result.status_counts["LEFT_BLANK"],4)
        self.assertEqual(result.status_counts["UNSUPPORTED"],6)
        self.assertTrue(result.ready_for_write)
        self.assertEqual({f.field_key for f in result.fields if f.runtime_status=='LEFT_BLANK'}, {'consent','disagree','consent_2','disagree_2'})
        self.assertTrue(all(f.value is None for f in result.fields if f.runtime_status=='LEFT_BLANK'))
        reparsed=HwpxParser().parse(fx.output);texts=[p.text for p in paragraph_map(reparsed).values() if p]
        self.assertEqual(sum('테스트 업체' in t for t in texts),3);self.assertEqual(sum('테스트 대표' in t for t in texts),4)
        self.assertIn('1999-01-23', texts)
        self.assertIn('example@example.com', texts)
        self.assertTrue(any('2022년 03월 15일' in t for t in texts))
        self.assertTrue(any('5명' in t for t in texts))
        self.assertTrue(any('테스트 대표(인)' in t for t in texts));self.assertTrue(any('테스트 대표(서명/인)' in t for t in texts))
        with zipfile.ZipFile(fx.source) as a,zipfile.ZipFile(fx.output) as b:
            self.assertIsNone(b.testzip())
            old=minidom.parseString(a.read('Contents/section0.xml'));new=minidom.parseString(b.read('Contents/section0.xml'))
            changed_paths=[tuple(f.location_info['target_location']['native_ref']['element_path']) for f in result.fields if f.runtime_status=='RESOLVED']
            for key,p in paragraph_map(parsed).items():
                if p is None or any(key[1][:len(path)]==path or path[:len(key[1])]==key[1] for path in changed_paths):continue
                self.assertEqual(resolve(old.documentElement,list(key[1])).toxml(),resolve(new.documentElement,list(key[1])).toxml())
            for key,c in cells(parsed).items():
                if c.location.table_index in {5,7}:
                    self.assertEqual(resolve(old.documentElement,list(key[1])).toxml(),resolve(new.documentElement,list(key[1])).toxml())
            for path in changed_paths:
                # Existing p/run properties survive; only changed paragraph cache may disappear.
                before=resolve(old.documentElement,list(path));after=resolve(new.documentElement,list(path))
                self.assertEqual(dict(before.attributes.items()),dict(after.attributes.items()))
                self.assertEqual([dict(r.attributes.items()) for r in before.getElementsByTagName('hp:run')],[dict(r.attributes.items()) for r in after.getElementsByTagName('hp:run')])
            old.unlink();new.unlink()
        self.assertEqual(original,fx.source.read_bytes())
