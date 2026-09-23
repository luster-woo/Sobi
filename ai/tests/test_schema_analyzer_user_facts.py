"""Prompt/source contracts, not a measurement of live GMS semantic accuracy."""
import json
import unittest

from test_schema_analyzer import candidate, field, source, response, FakeClient
from app.agent.documents.schema_analyzer import GmsSchemaAnalyzer, SourceCatalog
from app.agent.documents.schema_analyzer.prompt import build_prompt, FEW_SHOT_EXAMPLES
from app.agent.documents.schema_analyzer.models import AnalyzedField


class UserFactAnalyzerTests(unittest.IsolatedAsyncioTestCase):
    async def check_fact(self, label, context, key, value_type='TEXT', *, inline=False):
        original = candidate(label, context=context, hints={'target_kind': 'inline_blank' if inline else 'empty'})
        fake = FakeClient(response(field(sources=[source(key, 'USER')], value_type=value_type)))
        result = await GmsSchemaAnalyzer(client=fake).analyze([original])
        analysis = result.fields[0].analysis
        self.assertEqual((analysis.semantic_type, analysis.mapping_status), ('DIRECT', 'RESOLVED'))
        self.assertEqual(analysis.sources[0].source_key, key)
        self.assertEqual(analysis.value_type, value_type)
        self.assertEqual(result.fields[0].candidate, original)
        sent = json.loads(fake.calls[0]['user_payload'])['candidates'][0]
        self.assertEqual(sent['context'], context)
        self.assertIn(key, fake.calls[0]['system_prompt'])

    async def test_representative_name_variants(self):
        for label, context in (('대 표 자', '업체 정보'), ('대표자', '업체 정보'),
                               ('성 명', '대표자 정보'), ('성 명', '사업체 대표자 정보')):
            with self.subTest(label=label, context=context):
                await self.check_fact(label, context, 'USER_NAME')

    async def test_inline_repeated_names(self):
        for label, context in (('대표자', '신청서 하단 업 체 명 : [빈칸] 대표자 : [빈칸] (인)'),
                               ('성 명', '사업체 대표자의 동의서 하단 업체명 : [빈칸] 성 명 : [빈칸] (서명/인)')):
            await self.check_fact(label, context, 'USER_NAME', inline=True)

    async def test_email_variants(self):
        for label in ('E-mail', '이메일', '전자우편'):
            await self.check_fact(label, '신청자 본인 / 대표자 정보', 'USER_EMAIL')

    async def test_birth_date_contexts(self):
        for context in ('대표자 정보 / 성명 / 생년월일', '신청자 본인 정보'):
            await self.check_fact('생년월일', context, 'USER_BIRTH_DATE', 'DATE')

    async def test_third_party_not_forced(self):
        for person in ('담당자', '대리인', '수임자', '자녀', '배우자', '직원', '상담자', '별도 연락 담당자'):
            for label, value_type in (('성명', 'TEXT'), ('이메일', 'TEXT'), ('생년월일', 'DATE')):
                with self.subTest(person=person, label=label):
                    fake = FakeClient(response(field(semantic='USER_INPUT', sources=[], value_type=value_type)))
                    result = await GmsSchemaAnalyzer(client=fake).analyze([candidate(label, context=person + ' 정보')])
                    self.assertEqual(result.fields[0].analysis.semantic_type, 'USER_INPUT')
                    self.assertEqual(result.fields[0].analysis.sources, [])

    def test_catalog_birth_date_and_user_descriptions(self):
        payload = {x['source_key']: x for x in SourceCatalog().payload()}
        birth = payload['USER_BIRTH_DATE']
        self.assertEqual((birth['source_type'], birth['field_type'], birth['runtime_supported']), ('USER', 'DIRECT', True))
        self.assertIn('birth date (DATE)', birth['description'])
        self.assertFalse(birth['source_params_schema']['additionalProperties'])
        for key in ('USER_NAME', 'USER_EMAIL', 'USER_BIRTH_DATE'):
            self.assertIn("Registered user's stored", payload[key]['description'])

    def test_prompt_no_conflicting_birth_policy(self):
        prompt = build_prompt(SourceCatalog())
        self.assertNotIn('생년월일 SourceKey를 만들지 않는다', prompt)
        self.assertNotIn('생년월일과 출산일은 semantic_type=USER_INPUT', prompt)
        self.assertIn('USER_INPUT은 \'사용자와 관련된 값\'이라는 뜻이 아니다', prompt)
        self.assertIn('각 USER_INPUT 후보의 label+context를 USER_NAME / USER_EMAIL / USER_BIRTH_DATE와 재대조', prompt)
        self.assertIn('같은 SourceKey를 재사용', prompt)

    def test_positive_and_negative_fewshots_valid(self):
        examples = {x['correct_analysis']['field_key']: x for x in FEW_SHOT_EXAMPLES}
        for key, source_key in (('owner_name', 'USER_NAME'), ('footer_owner_name', 'USER_NAME'),
                                ('consent_owner_name', 'USER_NAME'), ('user_email', 'USER_EMAIL'),
                                ('applicant_email', 'USER_EMAIL'), ('birth_date', 'USER_BIRTH_DATE'),
                                ('applicant_birth_date', 'USER_BIRTH_DATE')):
            analysis = AnalyzedField.model_validate(examples[key]['correct_analysis'])
            self.assertEqual(analysis.sources[0].source_key, source_key)
            self.assertEqual(analysis.semantic_type, 'DIRECT')
        for key in ('contact_name', 'proxy_name', 'contact_email', 'child_birth_date', 'contact_birth_date'):
            analysis = AnalyzedField.model_validate(examples[key]['correct_analysis'])
            self.assertEqual(analysis.semantic_type, 'USER_INPUT')
            self.assertEqual(analysis.sources, [])

    async def test_mistaken_user_input_is_not_silently_corrected(self):
        # Existing architecture does not infer semantics in Python. This deliberately
        # exposes the remaining limitation rather than claiming fake GMS proves stability.
        original = candidate('E-mail', context='대표자 정보 / 성명 / 생년월일')
        prompts = []
        for semantic, sources in (('DIRECT', [source('USER_EMAIL', 'USER')]), ('USER_INPUT', [])):
            fake = FakeClient(response(field(semantic=semantic, sources=sources)))
            result = await GmsSchemaAnalyzer(client=fake).analyze([original])
            self.assertEqual(result.fields[0].analysis.semantic_type, semantic)
            self.assertEqual(len(fake.calls), 1)  # Valid contracts do not trigger repair.
            prompts.append(fake.calls[0]['system_prompt'])
        self.assertEqual(prompts[0], prompts[1])

    async def test_same_fixed_response_is_repeatable(self):
        original = candidate('E-mail', context='대표자 정보')
        output = response(field(sources=[source('USER_EMAIL', 'USER')]))
        fake = FakeClient(output, output)
        analyzer = GmsSchemaAnalyzer(client=fake)
        first = await analyzer.analyze([original])
        second = await analyzer.analyze([original])
        self.assertEqual(first, second)
