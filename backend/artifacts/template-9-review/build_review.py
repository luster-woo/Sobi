"""Reproduce reviewed schema with existing code; no GMS or real DB calls."""
import asyncio
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
import tempfile

HERE = Path(__file__).resolve().parent
AI = HERE.parents[2] / 'ai'
sys.path.insert(0, str(AI))
sys.path.insert(0, str(AI / 'tests'))
from app.agent.documents.parser import HwpxParser
from app.agent.documents.candidates import FieldCandidateExtractor
from app.agent.documents.schema_analyzer.analyzer import GmsSchemaAnalyzer
from app.agent.documents.schema_analyzer.models import SemanticResponse
from app.agent.documents.schema_persistence import DocumentSchemaPersistenceService
from app.agent.documents.runtime.models import DocumentRuntimeResult, ResolvedField
from app.agent.documents.writer.hwpx import HwpxWriter, cells
from test_schema_persistence import FakeDB

EXPECTED_HASH = 'dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84'

def save(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def source(key, priority=1):
    return dict(source_type='USER' if key.startswith('USER_') else 'BUSINESS',
                source_key=key, priority=priority, required=True, source_params={})

async def main(path):
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    assert before == EXPECTED_HASH, 'Different normalized HWPX: stop without producing SQL'
    parsed = HwpxParser().parse(path)
    candidates = FieldCandidateExtractor().extract(parsed)
    assert len(candidates) == 39
    save('parsed.json', parsed.model_dump(mode='json'))
    save('candidates.json', [c.model_dump(mode='json') for c in candidates])
    keys = '''business_name applicant_name business_address applicant_mobile applicant_email
    outdoor_sign_change new_sign_install sign_replacement sign_equipment_replacement
    interior_renovation led_electrical_work dining_table_replacement pos_system table_order
    consulting_service consulting_finance ignored_header business_plan_detail
    estimate_business_name estimate_applicant_name planned_application_category contractor_name
    planned_improvement_item planned_quantity planned_specification quoted_supply_price quoted_vat
    total_supply_price previous_application_yes previous_application_no anti_kickback_acknowledgement
    bonus_evidence_acknowledgement evidence_deadline_acknowledgement
    privacy_collection_consent privacy_collection_refusal province_sharing_consent
    province_sharing_refusal external_sharing_consent external_sharing_refusal'''.split()
    assert len(keys) == 39
    direct = {1:'BUSINESS_NAME', 2:'USER_NAME', 3:'BUSINESS_ADDRESS', 5:'USER_EMAIL',
              19:'BUSINESS_NAME', 20:'USER_NAME'}
    fields = []
    for n, (candidate, key) in enumerate(zip(candidates, keys), 1):
        f = dict(candidate_id=candidate.candidate_id, field_key=key,
                 semantic_type='USER_INPUT', value_type='BOOLEAN', required=False,
                 mapping_status='RESOLVED', sources=[], confidence=0.95,
                 note='신청자 선택·확인·동의 값. 자동으로 동의하거나 체크하지 않는다.')
        if n in direct:
            f.update(semantic_type='DIRECT', value_type='TEXT', sources=[source(direct[n])],
                     note='현재 SourceRegistry의 직접 조회 키에 매핑. 실제 사용자 데이터 유무는 Runtime에서 확인.')
        elif n == 4:
            f.update(value_type='TEXT',
                     note='DB에 전화번호가 없으므로 사용자가 직접 입력한다. Source 조회 없이 빈칸으로 남긴다.')
        elif n in (26, 27, 28):
            f.update(semantic_type='COMPUTED' if n == 28 else 'DIRECT',
                     value_type='NUMBER', mapping_status='UNSUPPORTED',
                     note='견적 공급가·부가세/합계에 대응하는 지원 Source 또는 계산기가 없어 비워둔다.')
        elif n == 17:
            f.update(semantic_type='IGNORE', field_key=None, value_type=None,
                     mapping_status='UNSUPPORTED', confidence=0.8,
                     note='사업 추진계획 제목과 같은 행의 작은 빈 셀. 실제 본문은 candidate_018의 9문단 셀이다.')
        elif n == 18:
            f.update(semantic_type='GENERATED', value_type='TEXT', confidence=0.85,
                     sources=[source(k,i) for i,k in enumerate(
                         ['BUSINESS_NAME','BUSINESS_CATEGORY','BUSINESS_ADDRESS'], 1)],
                     instruction='2026 경북 소상공인 새바람 체인지업 사업의 사업 추진계획을 공백 포함 300자 이내로 작성한다. 제공된 업체명·업종·사업장 주소만 사실로 사용한다. 점포 소개와 개선 목적을 간략히 기술하되, 신청자가 선택한 개선 품목·시공업체·견적·매출·현장 결함·성과를 추측하거나 확정 사실처럼 만들지 않는다. 구체적인 개선 내용이나 필요성을 작성하기에 정보가 부족하면 성공 문장으로 꾸미지 말고 INPUT_REQUIRED로 필요한 정보를 요청한다.',
                     note='9개 빈 문단을 가진 본문 셀. 원문의 300자 제한을 instruction과 SQL max_length에 반영. 부족한 개선 정보는 Runtime에서 요청해야 한다.')
        elif 21 <= n <= 25:
            f.update(value_type='NUMBER' if n == 24 else 'TEXT',
                     note='신청자가 정할 개선계획/외주업체/예정 품목/수량/규격. 신청자의 기존 업체명과 외주업체명을 혼동하지 않는다.')
        fields.append(f)
    response = SemanticResponse.model_validate({'fields': fields})
    analyzer = GmsSchemaAnalyzer(client=None)
    joined = analyzer._join(candidates, analyzer._validate(response, candidates))
    save('reviewed-analysis.json', joined.model_dump(mode='json'))
    db = FakeDB()
    db.templates[9] = '작성용'
    persisted = await DocumentSchemaPersistenceService(db.acquire).persist(9, joined)
    payload = []
    for f in db.fields:
        entry = {k:v for k,v in f.items() if k not in ('id', 'template_id')}
        entry['max_length'] = 300 if f['field_key'] == 'business_plan_detail' else None
        entry['sources'] = [{k:v for k,v in s.items() if k != 'field_schema_id'}
                            for s in db.sources if s['field_schema_id'] == f['id']]
        payload.append(entry)
    save('replacement-payload.json', payload)

    # Real Writer on this source, with explicitly synthetic values and temporary output only.
    runtime_fields = []
    for i, f in enumerate(payload, 1):
        supported = f['mapping_status'] == 'RESOLVED' and f['field_type'] != 'USER_INPUT'
        status = 'RESOLVED' if supported else ('LEFT_BLANK' if f['field_type'] == 'USER_INPUT' else 'UNSUPPORTED')
        value = ('검증용 점포 소개\n검증용 개선 계획' if f['field_type'] == 'GENERATED' else '검증용 값') if supported else None
        runtime_fields.append(ResolvedField(field_schema_id=i, **{k:v for k,v in f.items() if k != 'sources'},
            sources=[dict(id=j, **s) for j,s in enumerate(f['sources'], 1)], runtime_status=status, value=value))
    runtime = DocumentRuntimeResult(template_id=9, program_document_id=40, schema_version=1,
        normalized_format='HWPX', normalized_path=str(path), fields=runtime_fields,
        total_fields=len(runtime_fields), status_counts=dict(Counter(f.runtime_status for f in runtime_fields)),
        ready_for_write=True)
    from app.agent.documents.runtime.service import DocumentAgentRuntime
    phone = next(f for f in runtime_fields if f.field_key == 'applicant_mobile')
    await object.__new__(DocumentAgentRuntime)._route(phone, phone, None)
    assert phone.runtime_status == 'LEFT_BLANK' and phone.value is None and not phone.sources
    original_cells = cells(parsed)
    changed = set()
    with tempfile.TemporaryDirectory(prefix='template9-writer-') as temporary:
        output = Path(temporary) / 'synthetic.hwpx'
        written = HwpxWriter().write(source_path=path, runtime_result=runtime, output_path=output)
        after_cells = cells(HwpxParser().parse(output))
        for f in runtime_fields:
            ref = f.location_info['target_location']['native_ref']
            key = (ref['section_file'], tuple(ref['element_path']))
            assert original_cells[key].text == f.location_info['current_text']
            if f.runtime_status == 'RESOLVED':
                changed.add(key)
                assert str(f.value) in after_cells[key].text
                assert len(original_cells[key].paragraphs) == len(after_cells[key].paragraphs)
        assert set(original_cells) == set(after_cells)
        for key in set(original_cells) - changed:
            assert original_cells[key].model_dump() == after_cells[key].model_dump()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before
    assert written.written_count == 7
    save('validation.json', dict(source_sha256=before, candidates=len(candidates),
        persistence= persisted.model_dump(mode='json'), field_types=dict(Counter(f['field_type'] for f in payload)),
        mapping_statuses=dict(Counter(f['mapping_status'] for f in payload)),
        writer_written=written.written_count, writer_skipped=written.skipped_count,
        original_unchanged=True, unchanged_cells_verified=len(original_cells)-len(changed),
        target_paragraph_counts_preserved=True, gms_called=False, database_called=False,
        postgresql_executed=False, phone_runtime_status=phone.runtime_status))
    sql = (HERE / 'replacement.sql.in').read_text(encoding='utf-8').replace('__PAYLOAD__', json.dumps(payload, ensure_ascii=False, indent=2))
    (HERE / 'replace-template-9.sql').write_text(sql, encoding='utf-8')
    print(json.dumps(json.loads((HERE/'validation.json').read_text(encoding='utf-8')), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    asyncio.run(main(Path(sys.argv[1])))
