import json
from pathlib import Path
import unittest

from test_schema_analyzer import candidate, field, source, response, FakeClient
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer, SchemaAnalysisError, SourceCatalog
from app.agent.documents.schema_analyzer.prompt import build_prompt, FEW_SHOT_EXAMPLES, ENUM_CONTRACT
from app.agent.documents.schema_analyzer.models import AnalyzedField


class AnalyzerV11Tests(unittest.IsolatedAsyncioTestCase):
    async def repair_case(self, invalid, corrected=None, original=None):
        client = FakeClient(response(invalid), response(corrected or field()))
        result = await GmsSchemaAnalyzer(client=client).analyze([original or candidate()])
        repair = json.loads(client.calls[1]["user_payload"])["repair"]
        return result, repair, client

    async def test_actual_failure_enum_repair_success(self):
        invalid = field(semantic="USER_INPUT", status="USER_INPUT", sources=[])
        result, repair, client = await self.repair_case(invalid)
        error = repair["errors"][0]
        self.assertEqual(error, {"candidate_id":"c1", "path":"mapping_status",
            "received":"USER_INPUT", "allowed":["RESOLVED","NEEDS_REVIEW","UNSUPPORTED"],
            "code":"SCHEMA_CONTRACT_ENUM"})
        self.assertEqual(result.fields[0].analysis.semantic_type, "DIRECT")
        self.assertEqual(len(client.calls), 2)

    async def test_ignore_invalid_status(self):
        invalid = field(semantic="IGNORE", status="IGNORE", sources=[], key=None, value_type=None)
        _, repair, _ = await self.repair_case(invalid)
        self.assertEqual(repair["errors"][0]["received"], "IGNORE")

    async def test_same_enum_failure_twice(self):
        bad=response(field(semantic="USER_INPUT", status="USER_INPUT", sources=[]))
        client=FakeClient(bad,bad)
        with self.assertRaises(SchemaAnalysisError) as caught:
            await GmsSchemaAnalyzer(client=client).analyze([candidate()])
        self.assertEqual(caught.exception.code,"SCHEMA_VALIDATION_FAILED")
        self.assertEqual(len(client.calls),2)

    async def test_actual_sanitized_16_field_response(self):
        raw=(Path(__file__).parent/'fixtures/schema_analyzer/invalid_mapping_status_card.json').read_text(encoding='utf-8')
        bad=json.loads(raw)
        corrected=json.loads(raw)
        for f in corrected['fields']:
            if f['mapping_status']=='USER_INPUT':
                f['mapping_status']='RESOLVED'
        corrected['fields'][0]=field(cid='candidate_001')
        candidates=[candidate(cid=f['candidate_id']) for f in bad['fields']]
        client=FakeClient(raw,json.dumps(corrected))
        result=await GmsSchemaAnalyzer(client=client).analyze(candidates)
        errors=json.loads(client.calls[1]['user_payload'])['repair']['errors']
        self.assertEqual(len(errors),15)
        self.assertTrue(all(e['path']=='mapping_status' for e in errors))
        self.assertEqual(len(result.fields),16)

    async def test_valid_resolved_types(self):
        cases=[field(), field(semantic="COMPUTED", sources=[source("BUSINESS_AGE_MONTHS")]),
               field(semantic="GENERATED"), field(semantic="USER_INPUT",sources=[]),
               field(semantic="IGNORE",sources=[],key=None,value_type=None)]
        for value in cases:
            with self.subTest(semantic=value['semantic_type']):
                client=FakeClient(response(value))
                result=await GmsSchemaAnalyzer(client=client).analyze([candidate()])
                self.assertEqual(result.fields[0].analysis.mapping_status,"RESOLVED")
                self.assertEqual(len(client.calls),1)

    async def test_direct_unsupported_no_source(self):
        client=FakeClient(response(field(status="UNSUPPORTED",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("카드 매출액(2025년)")])
        self.assertEqual(result.fields[0].analysis.semantic_type,"DIRECT")
        self.assertFalse(result.fields[0].runtime_supported)

    async def test_empty_not_forced_user_input(self):
        original=candidate(current_text="",hints={"target_kind":"empty"})
        result,_,_=await self.repair_case(field(status="USER_INPUT"),original=original)
        self.assertEqual(result.fields[0].analysis.sources[0].source_key,"BUSINESS_NAME")

    async def test_helper_not_forced_ignore(self):
        original=candidate("업종",current_text="(사업자등록증 상)",hints={"target_kind":"helper"})
        client=FakeClient(response(field(sources=[source("BUSINESS_CATEGORY")])))
        result=await GmsSchemaAnalyzer(client=client).analyze([original])
        self.assertEqual(result.fields[0].analysis.semantic_type,"DIRECT")
        self.assertEqual(result.fields[0].candidate.current_text,original.current_text)

    async def test_unit_suffix_is_not_existing_value(self):
        original=candidate("현)상시근로자",current_text="명",hints={"target_kind":"unit_suffix"})
        client=FakeClient(response(field(sources=[source("EMPLOYEE_COUNT")],value_type="NUMBER")))
        result=await GmsSchemaAnalyzer(client=client).analyze([original])
        self.assertEqual(result.fields[0].analysis.semantic_type,"DIRECT")
        self.assertIn("현재 입력된 값이 아니다",client.calls[0]['system_prompt'])

    async def test_invalid_source_key_details(self):
        _,repair,_=await self.repair_case(field(sources=[source("CARD_REVENUE","MYDATA")]))
        error=repair['errors'][0]
        self.assertEqual(error['candidate_id'],'c1')
        self.assertEqual(error['path'],'sources[0].source_key')
        self.assertEqual(error['received'],'CARD_REVENUE')
        self.assertEqual(error['code'],'SOURCE_KEY_NOT_ALLOWED')
        self.assertIn('BUSINESS_NAME',error['allowed'])
        self.assertNotIn('CARD_REVENUE',error['allowed'])

    async def test_repair_keeps_full_input(self):
        _,_,client=await self.repair_case(field(status="USER_INPUT"))
        first=json.loads(client.calls[0]['user_payload'])
        second=json.loads(client.calls[1]['user_payload'])
        self.assertEqual(first['candidates'],second['candidates'])
        self.assertIn('전체 후보의 전체 결과',second['repair']['message'])

    async def test_logs_only_safe_identity(self):
        original=candidate("PRIVATE_LABEL",context="PRIVATE_CONTEXT")
        with self.assertLogs('app.agent.documents.schema_analyzer.analyzer',level='DEBUG') as logs:
            await self.repair_case(field(status="USER_INPUT",note="PRIVATE_NOTE"),original=original)
        text=' '.join(logs.output)
        self.assertIn('candidate_id=c1',text)
        self.assertIn('path=mapping_status',text)
        self.assertNotIn('PRIVATE',text)
        self.assertNotIn('USER_INPUT',text)

    async def test_bad_enum_secret_redacted(self):
        _,repair,_=await self.repair_case(field(status="sk-test-secret-123"))
        self.assertEqual(repair['errors'][0]['received'],'<redacted>')
        self.assertNotIn('sk-test',json.dumps(repair))

    async def test_unknown_path_secret_redacted(self):
        value=field(); value['Authorization: secret']='private'
        _,repair,_=await self.repair_case(value)
        self.assertNotIn('Authorization',json.dumps(repair))
        self.assertNotIn('private',json.dumps(repair))

    async def test_source_pair_details(self):
        _,repair,_=await self.repair_case(field(sources=[source("USER_NAME","BUSINESS")]))
        self.assertEqual(repair['errors'][0]['code'],'SOURCE_PAIR_NOT_ALLOWED')
        self.assertEqual(repair['errors'][0]['path'],'sources[0].source_key')
        self.assertIn('BUSINESS_NAME',repair['errors'][0]['allowed'])

    async def test_fixed_period_details(self):
        bad=field(semantic="COMPUTED",sources=[source("REVENUE_SUM","MYDATA",source_params={"months":12})])
        corrected=field(status="UNSUPPORTED",sources=[])
        _,repair,_=await self.repair_case(bad,corrected,candidate("매출액(2025년)"))
        self.assertEqual(repair['errors'][0]['code'],'FIXED_PERIOD_NOT_SUPPORTED')
        self.assertEqual(repair['errors'][0]['candidate_id'],'c1')

    def test_prompt_contract_repeated_and_examples_valid(self):
        prompt=build_prompt(SourceCatalog())
        self.assertEqual(prompt.count(ENUM_CONTRACT),2)
        self.assertIn('empty ≠ USER_INPUT',prompt)
        self.assertIn('helper ≠ IGNORE',prompt)
        self.assertIn('STEP 2',prompt)
        for example in FEW_SHOT_EXAMPLES:
            AnalyzedField.model_validate(example['correct_analysis'])

    async def test_no_silent_semantic_correction(self):
        client=FakeClient(response(field(semantic="USER_INPUT",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("업체명")])
        self.assertEqual(result.fields[0].analysis.semantic_type,"USER_INPUT")


if __name__ == '__main__':
    unittest.main()
