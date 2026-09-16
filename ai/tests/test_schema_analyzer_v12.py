import json
import unittest
from test_schema_analyzer import candidate, field, response, FakeClient
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer, SchemaAnalysisError, SourceCatalog
from app.agent.documents.schema_analyzer.prompt import build_prompt, FEW_SHOT_EXAMPLES
from app.agent.documents.schema_analyzer.models import AnalyzedField


class AnalyzerV12Tests(unittest.IsolatedAsyncioTestCase):
    async def test_direct_review_without_source(self):
        client=FakeClient(response(field(status="NEEDS_REVIEW",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("대표자")])
        self.assertEqual(result.fields[0].analysis.semantic_type,"DIRECT")
        self.assertEqual(result.fields[0].analysis.mapping_status,"NEEDS_REVIEW")
        self.assertEqual(result.fields[0].analysis.sources,[])

    async def test_generated_review_without_source(self):
        client=FakeClient(response(field(semantic="GENERATED",status="NEEDS_REVIEW",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("사업 계획")])
        self.assertEqual(result.fields[0].analysis.semantic_type,"GENERATED")

    async def test_direct_unsupported_without_source(self):
        client=FakeClient(response(field(status="UNSUPPORTED",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("매출액(2025년)")])
        self.assertEqual(result.fields[0].analysis.mapping_status,"UNSUPPORTED")

    async def test_status_as_semantic_rejected(self):
        for value in ("NEEDS_REVIEW","UNSUPPORTED","RESOLVED"):
            with self.subTest(value=value):
                raw=response(field(semantic=value,status="NEEDS_REVIEW",sources=[]))
                client=FakeClient(raw,raw)
                with self.assertRaises(SchemaAnalysisError):
                    await GmsSchemaAnalyzer(client=client).analyze([candidate()])
                self.assertEqual(len(client.calls),2)

    async def test_two_actual_candidate_failures_repeated(self):
        candidates=[candidate("대표자",cid="candidate_002"),candidate("성명",cid="candidate_008")]
        raw=response(*(field(cid=c.candidate_id,semantic="NEEDS_REVIEW",status="NEEDS_REVIEW",sources=[]) for c in candidates))
        client=FakeClient(raw,raw)
        with self.assertRaises(SchemaAnalysisError) as caught:
            await GmsSchemaAnalyzer(client=client).analyze(candidates)
        self.assertEqual(caught.exception.code,"SCHEMA_VALIDATION_FAILED")
        self.assertEqual(len(client.calls),2)
        repair=json.loads(client.calls[1]['user_payload'])['repair']
        self.assertEqual([e['candidate_id'] for e in repair['errors']],["candidate_002","candidate_008"])
        for error in repair['errors']:
            self.assertEqual(error['path'],'semantic_type')
            self.assertEqual(error['received'],'NEEDS_REVIEW')
            self.assertEqual(error['allowed'],['DIRECT','COMPUTED','GENERATED','USER_INPUT','IGNORE'])

    async def test_repair_message_and_success(self):
        client=FakeClient(response(field(semantic="NEEDS_REVIEW",status="NEEDS_REVIEW",sources=[])),
                          response(field(status="NEEDS_REVIEW",sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate("대표자")])
        repair=json.loads(client.calls[1]['user_payload'])['repair']
        self.assertTrue(repair['message'].startswith('중요:'))
        self.assertIn('allowed 목록에서 반드시 하나',repair['message'])
        self.assertIn('mapping_status 값을 semantic_type에 넣어서는 안 됩니다',repair['message'])
        self.assertEqual(result.fields[0].analysis.semantic_type,'DIRECT')

    def test_representative_fewshot(self):
        example=next(e for e in FEW_SHOT_EXAMPLES if e['candidate']['label']=='대표자')
        analysis=AnalyzedField.model_validate(example['correct_analysis'])
        self.assertEqual(analysis.semantic_type,'DIRECT')
        self.assertEqual(analysis.mapping_status,'RESOLVED')
        self.assertEqual(analysis.field_key,'representative_name')
        self.assertEqual(analysis.sources[0].source_type,'USER')
        self.assertEqual(analysis.sources[0].source_key,'USER_NAME')
        self.assertEqual(analysis.confidence,.95)

    def test_generated_fewshot(self):
        example=next(e for e in FEW_SHOT_EXAMPLES if e['correct_analysis']['semantic_type']=='GENERATED')
        analysis=AnalyzedField.model_validate(example['correct_analysis'])
        self.assertEqual(analysis.mapping_status,'NEEDS_REVIEW')
        self.assertEqual(analysis.sources,[])

    def test_prompt_ambiguous_sentences_removed(self):
        prompt=build_prompt(SourceCatalog())
        for phrase in ('NEEDS_REVIEW로 남긴다','모호하면 NEEDS_REVIEW',
                       'UNSUPPORTED로 처리한다','GENERATED의 source가 없으면 NEEDS_REVIEW'):
            self.assertNotIn(phrase,prompt)
        self.assertIn('semantic_type = DIRECT',prompt)
        self.assertIn('mapping_status = RESOLVED',prompt)
        self.assertIn('질문 A:',prompt)
        self.assertIn('질문 B:',prompt)
        self.assertIn('두 값은 semantic_type에 절대로 사용할 수 없다',prompt)


if __name__=='__main__':
    unittest.main()
