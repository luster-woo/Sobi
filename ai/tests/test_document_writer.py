import copy
from decimal import Decimal
import hashlib
import io
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
import xml.etree.ElementTree as ET
import zipfile

from test_document_parser import paragraph, cell, table, anchored, section
from test_document_runtime import field
from app.agent.documents.parser import HwpxParser
from app.agent.documents.runtime.models import ResolvedField, DocumentRuntimeResult
from app.agent.documents.writer import HwpxWriter, DocumentWriteError
from app.agent.documents.writer.hwpx import cells


class WriterTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source = self.root / 'source.hwpx'
        self.output = self.root / 'output.hwpx'
        self.writer = HwpxWriter()
        self.document([cell('')])

    def document(self, content, prefix='hp'):
        with zipfile.ZipFile(self.source, 'w') as archive:
            archive.comment = b'archive-comment'
            mime = zipfile.ZipInfo('mimetype', (2025,1,2,3,4,6))
            mime.compress_type=zipfile.ZIP_STORED
            archive.writestr(mime, b'application/hwp+zip')
            info=zipfile.ZipInfo('Contents/section0.xml',(2025,1,2,3,4,6))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.comment=b'section-comment';info.external_attr=0o600 << 16
            archive.writestr(info, section(anchored(table([''.join(content)])),prefix=prefix))
            archive.writestr('Contents/section2.xml', section(paragraph('unchanged')))
            archive.writestr('BinData/image.bin', b'\x00\xffimage')
        self.original=self.source.read_bytes()
        self.parsed_cells=list(cells(HwpxParser().parse(self.source)).values())

    def resolved(self, index=0, value='성현상사', kind='empty', value_type='TEXT', **overrides):
        target=self.parsed_cells[index]
        hints={'target_kind':kind}
        if kind=='helper':hints['helper_text']=target.text
        if kind=='unit_suffix':hints.update(unit='원',insertion_mode='BEFORE_SUFFIX')
        schema=field(key=f'field_{index}', id=index+1, value_type=value_type, order=10-index)
        data=schema.model_dump();data['field_schema_id']=data.pop('id')
        data.update(runtime_status='RESOLVED',value=value,location_info=dict(version=1,input_shape='SHORT_TEXT',current_text=target.text,hints=hints,target_location=target.location.model_dump(mode='json')))
        data.update(overrides)
        return ResolvedField(**data)

    def runtime(self, *fields, ready=True):
        return DocumentRuntimeResult(template_id=1,program_document_id=2,schema_version=1,normalized_format='HWPX',normalized_path=str(self.source),fields=list(fields),total_fields=len(fields),status_counts={},ready_for_write=ready)

    def write(self,*fields,ready=True):
        return self.writer.write(source_path=self.source,output_path=self.output,runtime_result=self.runtime(*(fields or [self.resolved()]),ready=ready))

    def assert_error(self,code,*fields,**kwargs):
        with self.assertRaises(DocumentWriteError) as caught:self.write(*fields,**kwargs)
        self.assertEqual(caught.exception.code,code)
        self.assertNotIn(str(self.root),str(caught.exception.as_dict()))
        self.assertFalse(self.output.exists())
        self.assertEqual(list(self.root.glob('.hwpx-writer-*')),[])

    def output_texts(self):return [c.text for c in cells(HwpxParser().parse(self.output)).values()]

    def test_empty_round_trip(self):
        result=self.write();self.assertEqual(self.output_texts(),['성현상사']);self.assertEqual((result.written_count,result.skipped_count),(1,0))
    def test_whitespace_empty(self):
        self.document([cell(' \t ')]);self.write();self.assertEqual(self.output_texts(),['성현상사'])
    def test_helper_preserved(self):
        self.document([cell(paragraphs=paragraph('')+paragraph('(사업자등록증 상)'))]);self.write(self.resolved(kind='helper',value='도소매업'));self.assertEqual(self.output_texts(),['도소매업\n(사업자등록증 상)'])
    def test_unit_suffix(self):
        self.document([cell('원')]);self.write(self.resolved(kind='unit_suffix',value=4000000,value_type='NUMBER'));self.assertEqual(self.output_texts(),['4000000원'])
    def test_unit_spacing(self):
        self.document([cell(' 원')]);self.write(self.resolved(kind='unit_suffix',value=4000000,value_type='NUMBER'));self.assertEqual(self.output_texts(),['4000000 원'])
    def test_decimal_exact(self):
        self.write(self.resolved(value=Decimal('1234567890123456789.123456789'),value_type='NUMBER'));self.assertEqual(self.output_texts(),['1234567890123456789.123456789'])
    def test_decimal_no_exponent(self):
        self.write(self.resolved(value=Decimal('1E-8'),value_type='NUMBER'));self.assertEqual(self.output_texts(),['0.00000001'])
    def test_multiline_and_escaping(self):
        self.write(self.resolved(value='가<&>\n나\n'))
        self.assertEqual(self.output_texts(),['가<&>\n나\n'])
        with zipfile.ZipFile(self.output) as archive:self.assertIn(b'<hp:lineBreak/>',archive.read('Contents/section0.xml'))
    def test_prefix_preserved(self):
        self.document([cell('')],prefix='pfx');self.write(self.resolved(value='a\nb'))
        with zipfile.ZipFile(self.output) as archive:
            xml=archive.read('Contents/section0.xml');self.assertIn(b'<pfx:lineBreak/>',xml);self.assertNotIn(b'ns0:',xml)
    def test_source_bytes_unchanged(self):
        self.write();self.assertEqual(hashlib.sha256(self.original).digest(),hashlib.sha256(self.source.read_bytes()).digest())
    def test_zip_metadata_unchanged(self):
        self.write()
        with zipfile.ZipFile(self.source) as a,zipfile.ZipFile(self.output) as b:
            self.assertIsNone(b.testzip());self.assertEqual(a.namelist(),b.namelist());self.assertEqual(a.comment,b.comment)
            for x,y in zip(a.infolist(),b.infolist()):
                for name in ['date_time','compress_type','comment','external_attr','extra']:self.assertEqual(getattr(x,name),getattr(y,name))
                if x.filename!='Contents/section0.xml':self.assertEqual(a.read(x),b.read(y))
    def test_not_ready(self):self.assert_error('WRITER_NOT_READY',ready=False)
    def test_required_status_cannot_bypass_ready(self):self.assert_error('WRITER_NOT_READY',self.resolved(runtime_status='ERROR'))
    def test_missing_file(self):
        self.source.unlink();self.assert_error('SOURCE_FILE_NOT_FOUND')
    def test_not_file(self):
        self.source.unlink();self.source.mkdir();self.assert_error('SOURCE_NOT_FILE')
    def test_unsupported_extension(self):
        self.source=self.root/'source.docx';self.assert_error('UNSUPPORTED_SOURCE_FORMAT')
    def test_invalid_zip(self):
        self.source.write_bytes(b'bad');self.assert_error('INVALID_HWPX_ARCHIVE')
    def test_missing_location(self):self.assert_error('LOCATION_INFO_MISSING',self.resolved(location_info={}))
    def altered(self,section,key,value):
        f=self.resolved();target=f.location_info
        for part in section:target=target[part]
        target[key]=value
        return f
    def test_location_version(self):self.assert_error('LOCATION_VERSION_UNSUPPORTED',self.altered([],'version',2))
    def test_target_type(self):self.assert_error('TARGET_TYPE_UNSUPPORTED',self.altered(['target_location'],'type','PARAGRAPH'))
    def test_target_kind(self):self.assert_error('TARGET_KIND_UNSUPPORTED',self.altered(['hints'],'target_kind','unknown'))
    def test_missing_section(self):self.assert_error('SECTION_FILE_NOT_FOUND',self.altered(['target_location','native_ref'],'section_file','Contents/section99.xml'))
    def test_invalid_path(self):self.assert_error('TARGET_PATH_NOT_FOUND',self.altered(['target_location','native_ref'],'element_path',[999]))
    def test_path_bool_rejected(self):self.assert_error('TARGET_PATH_NOT_FOUND',self.altered(['target_location','native_ref'],'element_path',[True]))
    def test_element_mismatch(self):self.assert_error('TARGET_ELEMENT_MISMATCH',self.altered(['target_location','native_ref'],'element_name','p'))
    def test_stale_guard(self):self.assert_error('TARGET_CONTENT_MISMATCH',self.altered([],'current_text',' '))
    def test_geometry_metadata(self):self.assert_error('TARGET_METADATA_MISMATCH',self.altered(['target_location'],'row_index',9))
    def test_unsupported_values(self):
        for kind,val in [('BOOLEAN',True),('JSON',{'a':1})]:
            with self.subTest(kind=kind):self.assert_error('VALUE_TYPE_UNSUPPORTED',self.resolved(value_type=kind,value=val))
    def test_invalid_value_type(self):self.assert_error('INVALID_VALUE',self.resolved(value=123,value_type='TEXT'))
    def test_invalid_characters(self):self.assert_error('TEXT_CHARACTER_UNSUPPORTED',self.resolved(value='a\tb'))
    def test_optional_statuses_skipped(self):
        self.document([cell(''),cell('')])
        for state in ['INPUT_REQUIRED','VALUE_MISSING','NEEDS_REVIEW','UNSUPPORTED','NOT_IMPLEMENTED','ERROR']:
            with self.subTest(state=state):
                result=self.write(self.resolved(),self.resolved(1,required=False,runtime_status=state))
                self.assertEqual(self.output_texts(),['성현상사','']);self.assertEqual(result.skipped_count,1);self.output.unlink()
    def test_multiple_fields_location_not_order(self):
        self.document([cell('',column=i) for i in range(4)])
        self.write(*[self.resolved(i,value=f'value{i}') for i in reversed(range(4))]);self.assertEqual(self.output_texts(),['value0','value1','value2','value3'])
    def test_preflight_atomicity(self):
        self.document([cell(''),cell('')]);bad=self.resolved(1);bad.location_info['current_text']='stale'
        self.assert_error('TARGET_CONTENT_MISMATCH',self.resolved(),bad);self.assertEqual(self.original,self.source.read_bytes())
    def test_validation_failure_cleanup(self):
        with patch.object(self.writer,'_validate',side_effect=DocumentWriteError('OUTPUT_VALIDATION_FAILED')):self.assert_error('OUTPUT_VALIDATION_FAILED')
        self.assertEqual(self.original,self.source.read_bytes())
    def test_duplicate_target(self):self.assert_error('DUPLICATE_TARGET',self.resolved(),self.resolved())
    def test_source_output_conflict(self):
        with self.assertRaises(DocumentWriteError) as caught:self.writer.write(source_path=self.source,output_path=self.source,runtime_result=self.runtime(self.resolved()))
        self.assertEqual(caught.exception.code,'SOURCE_OUTPUT_CONFLICT');self.assertEqual(self.source.read_bytes(),self.original)
    def test_output_collision_preserved(self):
        self.output.write_bytes(b'existing')
        with self.assertRaises(DocumentWriteError) as caught:self.write()
        self.assertEqual(caught.exception.code,'OUTPUT_ALREADY_EXISTS');self.assertEqual(self.output.read_bytes(),b'existing')
    def test_publish_race_preserved(self):
        def race(src,dst):
            Path(dst).write_bytes(b'other writer');raise FileExistsError()
        with patch('app.agent.documents.writer.hwpx.os.link',side_effect=race):
            with self.assertRaises(DocumentWriteError) as caught:self.write()
        self.assertEqual(caught.exception.code,'OUTPUT_ALREADY_EXISTS');self.assertEqual(self.output.read_bytes(),b'other writer');self.assertEqual(list(self.root.glob('.hwpx-writer-*')),[])
    def test_empty_run_supported(self):
        self.document([cell(paragraphs='<hp:p styleIDRef="8"><hp:run charPrIDRef="7"/></hp:p>')]);self.write();self.assertEqual(self.output_texts(),['성현상사'])
    def test_style_and_helper_xml_preserved(self):
        p='<hp:p styleIDRef="8"><hp:run charPrIDRef="7"><hp:t><hp:lineBreak/>(안내)</hp:t></hp:run><hp:linesegarray><hp:lineseg textpos="0"/></hp:linesegarray></hp:p>'
        self.document([cell(paragraphs=p)]);self.write(self.resolved(kind='helper',value='본문'))
        with zipfile.ZipFile(self.output) as archive:
            xml=archive.read('Contents/section0.xml');self.assertIn(b'styleIDRef="8"',xml);self.assertIn(b'charPrIDRef="7"',xml);self.assertNotIn(b'linesegarray',xml)
        self.assertEqual(self.output_texts(),['본문\n(안내)'])
    def test_empty_multiple_paragraphs_supported(self):
        self.document([cell(paragraphs=paragraph('')+paragraph(''))]);self.write()
        self.assertEqual(self.output_texts(), ['성현상사\n'])
    def test_control_structure_rejected(self):
        self.document([cell(paragraphs='<hp:p><hp:run><hp:ctrl/><hp:t/></hp:run></hp:p>')]);self.assert_error('TARGET_STRUCTURE_UNSUPPORTED')
    def test_wrong_insertion_mode(self):
        self.document([cell('원')]);f=self.resolved(kind='unit_suffix');f.location_info['hints']['insertion_mode']='AFTER';self.assert_error('INSERTION_MODE_UNSUPPORTED',f)
    def test_comments_do_not_shift_element_path(self):
        self.document([cell(paragraphs='<!--comment-->'+paragraph(''))]);self.write();self.assertEqual(self.output_texts(),['성현상사'])
    def test_no_resolved_fields(self):
        result=self.write(self.resolved(required=False,runtime_status='ERROR'));self.assertEqual(result.written_count,0);self.assertEqual(self.output_texts(),[''])

    def test_parser_candidate_stored_location_round_trip(self):
        from app.agent.documents.candidates import FieldCandidateExtractor
        from app.agent.documents.schema_persistence.models import StoredLocationInfo
        self.document([cell('기업명',row=0,column=0),cell('',row=0,column=1,cs=2)])
        candidates=FieldCandidateExtractor().extract(HwpxParser().parse(self.source))
        self.assertEqual(len(candidates),1)
        c=candidates[0]
        stored=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,input_shape=c.input_shape,hints=c.hints)
        f=self.resolved(1,location_info=stored.model_dump(mode='json'))
        before=copy.deepcopy(f.model_dump())
        self.write(f);self.assertEqual(self.output_texts(),['기업명','성현상사']);self.assertEqual(f.model_dump(),before)
    def test_no_sections(self):
        with zipfile.ZipFile(self.source,'w') as archive:archive.writestr('mimetype','application/hwp+zip')
        self.assert_error('INVALID_HWPX_ARCHIVE')
    def test_malformed_section(self):
        with zipfile.ZipFile(self.source,'w') as archive:archive.writestr('Contents/section0.xml','<bad>')
        self.assert_error('INVALID_HWPX_ARCHIVE')
    def test_dtd_rejected(self):
        with zipfile.ZipFile(self.source,'w') as archive:archive.writestr('Contents/section0.xml','<!DOCTYPE sec [<!ENTITY a "expanded">]><sec>&a;</sec>')
        self.assert_error('INVALID_HWPX_ARCHIVE')
    def test_empty_multiple_runs_preserved(self):
        self.document([cell(paragraphs=paragraph(runs=[' ',' ']))]);self.write()
        self.assertEqual(self.output_texts(),['성현상사'])
        with zipfile.ZipFile(self.output) as archive:
            root=ET.fromstring(archive.read('Contents/section0.xml'))
            tc=next(n for n in root.iter() if n.tag.endswith('}tc'))
            self.assertEqual(len([n for n in tc.iter() if n.tag.endswith('}run')]),2)
    def test_numeric_float_plain(self):
        self.write(self.resolved(value=0.00000001,value_type='NUMBER'));self.assertEqual(self.output_texts(),['0.00000001'])
    def test_output_validation_detects_wrong_logical_text(self):
        from app.agent.documents.writer.hwpx import mutate
        def corrupt(plan):
            plan.text='wrong';mutate(plan)
        with patch('app.agent.documents.writer.hwpx.mutate',side_effect=corrupt):self.assert_error('OUTPUT_VALIDATION_FAILED')
    def test_publish_failure_cleanup(self):
        with patch('app.agent.documents.writer.hwpx.os.link',side_effect=OSError('sensitive path')):self.assert_error('OUTPUT_PUBLISH_FAILED')
    def test_mutation_failure_cleanup(self):
        with patch('app.agent.documents.writer.hwpx.mutate',side_effect=RuntimeError('sensitive value')):self.assert_error('WRITER_FAILED')
        self.assertEqual(self.source.read_bytes(),self.original)

class WriterCliTests(unittest.TestCase):
    def test_cli_default_and_generate_flag(self):
        from app.agent.documents.writer.__main__ import main
        from app.agent.documents.writer.models import HwpxWriteResult
        result=HwpxWriteResult(source_path='secret',output_path='secret',total_fields=1,written_count=1,skipped_count=0)
        for flag in [[],['--generate']]:
            with patch('sys.argv',['writer','1','9','--output','out.hwpx',*flag]),patch('app.agent.documents.writer.__main__.run',new=AsyncMock(return_value=result)) as run,patch('sys.stdout',new_callable=io.StringIO) as out:
                self.assertEqual(main(),0);self.assertEqual(run.call_args.kwargs['generate'],bool(flag));self.assertNotIn('secret',out.getvalue())
    def test_cli_safe_error(self):
        from app.agent.documents.writer.__main__ import main
        with patch('sys.argv',['writer','1','9','--output','out.hwpx']),patch('app.agent.documents.writer.__main__.run',new=AsyncMock(side_effect=RuntimeError('secret'))),patch('sys.stderr',new_callable=io.StringIO) as out:
            self.assertEqual(main(),1);self.assertNotIn('secret',out.getvalue())
