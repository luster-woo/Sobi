import unittest
from test_schema_analyzer import candidate, field, source, response, FakeClient
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer, SourceCatalog
from app.agent.documents.schema_analyzer.prompt import build_prompt, FEW_SHOT_EXAMPLES
from app.agent.documents.schema_analyzer.models import AnalyzedField


class AnalyzerV121Tests(unittest.IsolatedAsyncioTestCase):
    async def test_representative_direct_resolved(self):
        for label in ("대표자", "대표자명", "대표자 성명"):
            client=FakeClient(response(field(sources=[source("USER_NAME","USER")])))
            result=await GmsSchemaAnalyzer(client=client).analyze([candidate(label)])
            analysis=result.fields[0].analysis
            self.assertEqual(analysis.semantic_type,"DIRECT")
            self.assertEqual(analysis.mapping_status,"RESOLVED")
            self.assertEqual(analysis.sources[0].source_key,"USER_NAME")

    async def test_owner_name_context(self):
        original=candidate("성명",context="대표자 정보 / 생년월일 / 핸드폰")
        client=FakeClient(response(field(sources=[source("USER_NAME","USER")])))
        result=await GmsSchemaAnalyzer(client=client).analyze([original])
        self.assertEqual(result.fields[0].analysis.sources[0].source_type,"USER")
        example=next(e for e in FEW_SHOT_EXAMPLES if e['candidate']['label']=='성명')
        self.assertIn('대표자 정보',example['candidate']['context'])
        self.assertEqual(example['correct_analysis']['sources'][0]['source_key'],'USER_NAME')

    async def test_other_person_not_forced_user_name(self):
        for context in ('자녀 정보','수임자 정보'):
            client=FakeClient(response(field(semantic='USER_INPUT',sources=[])))
            result=await GmsSchemaAnalyzer(client=client).analyze([candidate('성명',context=context)])
            self.assertEqual(result.fields[0].analysis.semantic_type,'USER_INPUT')
            self.assertEqual(result.fields[0].analysis.sources,[])
        prompt=build_prompt(SourceCatalog())
        self.assertIn('다른 사람의 이름이므로 USER_NAME으로 매핑하지 않는다',prompt)

    def test_obsolete_owner_policy_removed(self):
        prompt=build_prompt(SourceCatalog())
        for phrase in ('동일성 보장은 확인되지 않았다','동일성이 보장되지','대표자와 사용자 동일성은 확인 없이'):
            self.assertNotIn(phrase,prompt)
        self.assertIn('자신이 등록한 사업체의 사업자 소유자/대표자',prompt)

    async def test_user_input_date_independent_of_shape(self):
        for label in ('자녀 생년월일','출산일'):
            original=candidate(label)  # SHORT_TEXT physical shape
            client=FakeClient(response(field(semantic='USER_INPUT',sources=[],value_type='DATE')))
            result=await GmsSchemaAnalyzer(client=client).analyze([original])
            self.assertEqual(result.fields[0].analysis.value_type,'DATE')
            self.assertEqual(result.fields[0].analysis.mapping_status,'RESOLVED')
            self.assertEqual(result.fields[0].candidate.input_shape,'SHORT_TEXT')

    def test_date_fewshots_and_unique_ids(self):
        for label in ('자녀 생년월일','출산일'):
            example=next(e for e in FEW_SHOT_EXAMPLES if e['candidate']['label']==label)
            analysis=AnalyzedField.model_validate(example['correct_analysis'])
            self.assertEqual(analysis.semantic_type,'USER_INPUT')
            self.assertEqual(analysis.value_type,'DATE')
            self.assertEqual(analysis.sources,[])
        ids=[e['candidate']['candidate_id'] for e in FEW_SHOT_EXAMPLES]
        self.assertEqual(len(ids),len(set(ids)))

    def test_boolean_and_identifier_policy(self):
        examples={e['candidate']['label']:e['correct_analysis'] for e in FEW_SHOT_EXAMPLES}
        self.assertEqual(examples['동의']['value_type'],'BOOLEAN')
        self.assertEqual(examples['계좌번호']['value_type'],'TEXT')
        prompt=build_prompt(SourceCatalog())
        self.assertIn('주민등록번호는 USER_INPUT + TEXT',prompt)
        self.assertIn('semantic_type=USER_INPUT이라는 이유만으로 value_type=TEXT를 선택하지 않는다',prompt)

    async def test_no_semantic_autocorrection(self):
        client=FakeClient(response(field(status='NEEDS_REVIEW',sources=[])))
        result=await GmsSchemaAnalyzer(client=client).analyze([candidate('성명')])
        self.assertEqual(result.fields[0].analysis.mapping_status,'NEEDS_REVIEW')
        self.assertEqual(result.fields[0].analysis.sources,[])


if __name__=='__main__':
    unittest.main()
