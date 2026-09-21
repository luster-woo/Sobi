"""Original parser/extractor -> manually classified inline fields -> validated SQL."""
import asyncio
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[2]/'ai'))
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.schema_analyzer.analyzer import GmsSchemaAnalyzer
from app.agent.documents.schema_analyzer.models import SemanticResponse
from app.agent.documents.schema_persistence.models import StoredLocationInfo
from app.agent.documents.runtime.models import RuntimeFieldSchema, RuntimeTemplate, DocumentRuntimeRequest
from app.agent.documents.runtime import DocumentAgentRuntime
from app.agent.documents.writer import HwpxWriter
from app.agent.documents.writer.inline import paragraph_map
from app.agent.sources.service import SourceService
from app.agent.sources.provider import SourceData

def save(name,value):
    (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

async def main(path):
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest=='dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84'
    parsed=HwpxParser().parse(path)
    candidates=FieldCandidateExtractor().extract(parsed)
    old=json.loads((HERE/'candidates.json').read_text(encoding='utf-8'))
    table=[c.model_dump(mode='json') for c in candidates if c.target_location.type=='TABLE_CELL']
    for seq in (old,table):
        for c in seq: c.pop('candidate_id',None)
    assert old==table, 'Existing table candidates changed'
    inline=sorted([c for c in candidates if c.target_location.type=='PARAGRAPH_INLINE'],
        key=lambda c:(c.target_location.native_ref['element_path'],c.target_location.native_ref['inline_range']['start']))
    assert len(inline)==15
    fields=[]; counters={'name':0,'month':0,'day':0}
    for c in inline:
        part=c.hints.get('date_part','name');counters[part]+=1
        if part=='name': assert c.label=='신청인(대표자)'
        fields.append(dict(candidate_id=c.candidate_id,semantic_type='DIRECT',
            field_key=f'application_{part}_{counters[part]}',value_type='TEXT' if part=='name' else 'DATE',
            required=False,mapping_status='RESOLVED',confidence=1.0,
            sources=[dict(source_type='USER' if part=='name' else 'PROGRAM',
                          source_key='USER_NAME' if part=='name' else 'PROGRAM_DRAFT_DATE')]))
    analyzer=GmsSchemaAnalyzer(client=None)
    joined=analyzer._join(inline,analyzer._validate(SemanticResponse.model_validate({'fields':fields}),inline))
    save('inline-analysis.json',joined.model_dump(mode='json'))
    payload=[]
    for j in joined.fields:
        a,c=j.analysis,j.candidate
        payload.append(dict(field_key=a.field_key,field_label=c.label,field_type='DIRECT',
            value_type=a.value_type.value,mapping_status='RESOLVED',required=False,instruction=None,
            location_info=StoredLocationInfo(target_location=c.target_location,current_text=c.current_text,
                input_shape=c.input_shape,hints=c.hints).model_dump(mode='json'),
            sources=[s.model_dump(mode='json') for s in a.sources]))
    save('inline-payload.json',payload)
    old_payload=json.loads((HERE/'replacement-payload.json').read_text(encoding='utf-8'))
    all_fields=[]
    for i,f in enumerate(old_payload+payload):
        f=dict(f); f['field_order']=i
        f['sources']=[dict(id=k+1,**s) for k,s in enumerate(f['sources'])]
        all_fields.append(RuntimeFieldSchema(id=i+1,**f))
    template=RuntimeTemplate(template_id=9,program_document_id=40,support_program_id=1,
        document_type='작성용',parse_status='COMPLETED',schema_version=1,
        normalized_path=str(path),normalized_format='HWPX',fields=all_fields)
    facts={'USER_NAME':'검증대표','USER_EMAIL':'test@example.com','BUSINESS_NAME':'검증업체',
           'BUSINESS_ADDRESS':'검증주소','BUSINESS_CATEGORY':'검증업종'}
    runtime=DocumentAgentRuntime(repository=SimpleNamespace(load=AsyncMock(return_value=template)),
        source_resolver=SourceService(SimpleNamespace(fetch=AsyncMock(return_value=SourceData(values=facts)))),
        gms_client=SimpleNamespace(generate=AsyncMock(return_value=json.dumps(
            {'status':'GENERATED','content':'검증용 사업계획 초안','missing_information':[]}))))
    with patch('app.agent.documents.runtime.service.datetime') as clock:
        clock.now.side_effect=lambda tz:datetime(2026,9,20,15,1,tzinfo=timezone.utc).astimezone(tz)
        result=await runtime.resolve(DocumentRuntimeRequest(template_id=9,user_id=1))
        clock.now.assert_called_once()
    with tempfile.TemporaryDirectory() as d:
        output=Path(d)/'test.hwpx'
        written=HwpxWriter().write(source_path=path,runtime_result=result,output_path=output)
        before=paragraph_map(parsed); after=paragraph_map(HwpxParser().parse(output))
        for f in result.fields[-15:]:
            assert f.runtime_status=='RESOLVED'
            n=f.location_info['target_location']['native_ref']; k=(n['section_file'],tuple(n['element_path']))
            text=after[k].text
            if f.value_type=='DATE': assert text.strip()=='2026년 9월 21일'
            else: assert text=='신청인(대표자) :검증대표(서명, 인)'
        assert written.written_count==22
    assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
    save('inline-validation.json',dict(original_sha256=digest,total_candidates=len(candidates),
        existing_candidates_unchanged=True,added=counters,total_stored_fields=len(all_fields),
        writer_written=written.written_count,writer_skipped=written.skipped_count,
        date='2026-09-21',clock_calls=1,original_unchanged=True,real_db_called=False,real_gms_called=False))
    sql=(HERE/'inline-additions.sql.in').read_text(encoding='utf-8').replace('__PAYLOAD__',json.dumps(payload,ensure_ascii=False,indent=2))
    (HERE/'add-template-9-inline.sql').write_text(sql,encoding='utf-8')
    print((HERE/'inline-validation.json').read_text(encoding='utf-8'))

if __name__=='__main__':asyncio.run(main(Path(sys.argv[1])))
