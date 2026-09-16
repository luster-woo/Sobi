import unittest
from test_schema_analyzer import candidate, field, source, response, FakeClient
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer, SourceCatalog
from app.agent.documents.schema_analyzer.prompt import build_prompt, FEW_SHOT_EXAMPLES
from app.agent.documents.schema_analyzer.models import AnalyzedField


class AnalyzerV122Tests(unittest.IsolatedAsyncioTestCase):
    async def analyze(self,label,value,context=None):
        result=await GmsSchemaAnalyzer(client=FakeClient(response(value))).analyze([candidate(label,context=context)])
        return result.fields[0]

    async def test_business_address(self):
        result=await self.analyze('사업장 주소',field(sources=[source('BUSINESS_ADDRESS')]),'사업체 정보')
        self.assertEqual(result.analysis.sources[0].source_key,'BUSINESS_ADDRESS')
        prompt=build_prompt(SourceCatalog())
        self.assertIn('신청인 거주 주소/수임자 주소/자녀 주소로 대체하지 않는다',prompt)

    async def test_applicant_name(self):
        result=await self.analyze('성명',field(sources=[source('USER_NAME','USER')]),'신청인 정보 / 주민등록번호 / 이메일 / 연락처')
        self.assertEqual(result.analysis.sources[0].source_key,'USER_NAME')
        example=next(e for e in FEW_SHOT_EXAMPLES if e['correct_analysis']['field_key']=='applicant_name')
        self.assertIn('신청인 정보',example['candidate']['context'])

    async def test_child_name_not_forced(self):
        result=await self.analyze('성명',field(semantic='USER_INPUT',sources=[]),'출산(자녀) 정보')
        self.assertEqual(result.analysis.sources,[])
        self.assertEqual(result.analysis.semantic_type,'USER_INPUT')

    async def test_delegate_name_not_forced(self):
        result=await self.analyze('성명',field(semantic='USER_INPUT',sources=[]),'수임자 정보')
        self.assertEqual(result.analysis.sources,[])
        self.assertEqual(result.analysis.semantic_type,'USER_INPUT')

    async def test_corporate_registration_unsupported(self):
        result=await self.analyze('법인등록번호',field(status='UNSUPPORTED',sources=[]))
        self.assertEqual(result.analysis.semantic_type,'DIRECT')
        self.assertFalse(result.runtime_supported)

    async def test_missing_source_not_user_input(self):
        for label in ('주요생산품','홈페이지','종목'):
            result=await self.analyze(label,field(status='UNSUPPORTED',sources=[]))
            self.assertEqual(result.analysis.semantic_type,'DIRECT')
        self.assertIn('No SourceKey -> USER_INPUT 자동 판단은 금지',build_prompt(SourceCatalog()))

    async def test_historical_employee_count_not_forced_current(self):
        result=await self.analyze('종업원수(2025)',field(status='UNSUPPORTED',sources=[],value_type='NUMBER'))
        self.assertEqual(result.analysis.sources,[])
        example=next(e for e in FEW_SHOT_EXAMPLES if e['candidate']['label']=='종업원수(2025)')
        self.assertEqual(example['correct_analysis']['sources'],[])
        self.assertIn('현재값 source를 과거값으로 대신하지 않는다',build_prompt(SourceCatalog()))

    async def test_transport_cost_unsupported(self):
        result=await self.analyze('운반비(2025)',field(status='UNSUPPORTED',sources=[],value_type='NUMBER'))
        self.assertEqual(result.analysis.semantic_type,'DIRECT')
        self.assertEqual(result.analysis.value_type,'NUMBER')

    async def test_subsidy_computed_unsupported(self):
        result=await self.analyze('지원금신청액',field(semantic='COMPUTED',status='UNSUPPORTED',sources=[],value_type='NUMBER'),
                                  '운반비의 50%, 최대 5백만원까지 지원')
        self.assertEqual(result.analysis.semantic_type,'COMPUTED')
        self.assertEqual(result.analysis.sources,[])
        self.assertFalse(result.runtime_supported)

    async def test_establishment_not_forced_open_date(self):
        result=await self.analyze('설립연월일',field(status='NEEDS_REVIEW',sources=[],value_type='DATE'))
        self.assertEqual(result.analysis.sources,[])
        self.assertIn('설립연월일/법인 설립일을 사업자 개업일 OPEN_DATE와 자동 동일시하지 않는다',build_prompt(SourceCatalog()))

    async def test_business_start_date_regression(self):
        result=await self.analyze('사업 시작일',field(sources=[source('OPEN_DATE')],value_type='DATE'))
        self.assertEqual(result.analysis.sources[0].source_key,'OPEN_DATE')

    async def test_ambiguous_revenue_not_forced_input(self):
        result=await self.analyze('전년도 매출액 또는 월 매출액',field(status='NEEDS_REVIEW',sources=[],value_type='NUMBER'))
        self.assertEqual(result.analysis.semantic_type,'DIRECT')
        self.assertEqual(result.analysis.sources,[])

    async def test_user_input_policy_regression(self):
        for label in ('계좌번호','입금은행','예금주','동의','미동의','출생신고 지역','사용자 옵션'):
            result=await self.analyze(label,field(semantic='USER_INPUT',sources=[]))
            self.assertEqual(result.analysis.semantic_type,'USER_INPUT')
            self.assertEqual(result.analysis.mapping_status,'RESOLVED')

    async def test_childbirth_date_regression(self):
        result=await self.analyze('출산일',field(semantic='USER_INPUT',sources=[],value_type='DATE'))
        self.assertEqual(result.analysis.value_type,'DATE')
        self.assertEqual(result.analysis.semantic_type,'USER_INPUT')

    def test_fewshots_valid_and_category_caution(self):
        for example in FEW_SHOT_EXAMPLES:
            AnalyzedField.model_validate(example['correct_analysis'])
        prompt=build_prompt(SourceCatalog())
        self.assertIn('업태/종목 각각과 정확히 동일하다고 임의 가정하지 않는다',prompt)
        self.assertNotIn('DIRECT: 기존 SourceKey의 값을 계산 없이 그대로 조회한다.',prompt)
        self.assertIn('USER_INPUT 또는 mapping_status=UNSUPPORTED로 결정하기 전에',prompt)


if __name__=='__main__':
    unittest.main()
