import json
import logging
import sys
import types
import unittest
from unittest.mock import AsyncMock, Mock, patch

from test_field_candidate_extractor import cell
from app.agent.documents.candidates.models import FieldCandidate
from app.agent.documents.schema_analyzer import (
    GmsSchemaAnalyzer, SourceCatalog, SchemaAnalysisError, GmsSchemaAnalyzerClient,
)
from app.agent.documents.schema_analyzer.prompt import MAX_CONTEXT_LENGTH, SYSTEM_PROMPT
from app.agent.sources.defaults import build_registry
from app.agent.sources.enums import SourceKey, SourceType


def candidate(label="업체명", cid="c1", **kwargs):
    return FieldCandidate(candidate_id=cid, label=label, normalized_label=label,
        relation="RIGHT", input_shape="SHORT_TEXT", confidence=.95,
        label_location=cell(0, 0).location, target_location=cell(0, 1).location, **kwargs)


def source(key="BUSINESS_NAME", source_type="BUSINESS", **kwargs):
    return dict(source_key=key, source_type=source_type, **kwargs)


def field(cid="c1", semantic="DIRECT", sources=None, status="RESOLVED", key="business_name", value_type="TEXT", **kwargs):
    return dict(candidate_id=cid, semantic_type=semantic, field_key=key,
        value_type=value_type, mapping_status=status,
        sources=([source()] if sources is None else sources), confidence=.9, **kwargs)


def response(*fields):
    return json.dumps({"fields": list(fields)}, ensure_ascii=False)


class FakeClient:
    def __init__(self, *outputs):
        self.outputs = list(outputs)
        self.calls = []

    async def analyze(self, **kwargs):
        self.calls.append(kwargs)
        return self.outputs.pop(0)


class AnalyzerTests(unittest.IsolatedAsyncioTestCase):
    async def run_fields(self, candidates, *fields):
        client = FakeClient(response(*fields))
        result = await GmsSchemaAnalyzer(client=client).analyze(candidates)
        self.assertEqual(len(client.calls), 1)
        return result

    async def invalid(self, output, candidates=None):
        client = FakeClient(output, output)
        with self.assertRaises(SchemaAnalysisError) as caught:
            await GmsSchemaAnalyzer(client=client).analyze(candidates or [candidate()])
        self.assertEqual(len(client.calls), 2)
        self.assertEqual(caught.exception.code, "SCHEMA_VALIDATION_FAILED")

    async def test_direct_examples(self):
        cases = [("업체명", "BUSINESS_NAME", "BUSINESS", "TEXT"),
                 ("사업자등록번호", "BUSINESS_BRN", "BUSINESS", "TEXT"),
                 ("사업장주소", "BUSINESS_ADDRESS", "BUSINESS", "TEXT"),
                 ("개업일", "OPEN_DATE", "BUSINESS", "DATE"),
                 ("직원수", "EMPLOYEE_COUNT", "BUSINESS", "NUMBER"),
                 ("이메일", "USER_EMAIL", "USER", "TEXT")]
        for label, key, source_type, value_type in cases:
            with self.subTest(label=label):
                result = await self.run_fields([candidate(label)], field(sources=[source(key, source_type)], value_type=value_type))
                self.assertEqual(result.fields[0].analysis.semantic_type, "DIRECT")
                self.assertEqual(result.fields[0].analysis.value_type, value_type)

    async def test_representative_existing_key_resolved_prompt(self):
        result = await self.run_fields([candidate("대표자명")], field(sources=[source("USER_NAME", "USER")], status="RESOLVED"))
        self.assertEqual(result.fields[0].analysis.sources[0].source_key, "USER_NAME")
        self.assertTrue(result.fields[0].runtime_supported)
        self.assertIn("사업자 소유자/대표자", SYSTEM_PROMPT)

    async def test_user_input_examples(self):
        for label in ("서명", "동의", "주민등록번호", "계좌번호", "입금은행", "예금주"):
            with self.subTest(label=label):
                result = await self.run_fields([candidate(label)], field(semantic="USER_INPUT", sources=[], status="UNSUPPORTED"))
                self.assertEqual(result.fields[0].analysis.sources, [])
                self.assertIn(label, SYSTEM_PROMPT)

    async def test_unknown_key(self):
        await self.invalid(response(field(sources=[source("CARD_REVENUE", "MYDATA")])))

    async def test_mismatched_source_type(self):
        await self.invalid(response(field(sources=[source("BUSINESS_NAME", "USER")])))

    async def test_account_source_forbidden(self):
        await self.invalid(response(field(sources=[source("USER_NAME", "ACCOUNT")])))

    async def test_fixed_year_not_rolling(self):
        await self.invalid(response(field(semantic="COMPUTED", sources=[source("REVENUE_SUM", "MYDATA", source_params={"months":12})])), [candidate("매출액(2025년)")])

    async def test_fixed_year_unsupported(self):
        result = await self.run_fields([candidate("카드 매출액(2025년)")], field(semantic="USER_INPUT", sources=[], status="UNSUPPORTED"))
        self.assertEqual(result.fields[0].analysis.mapping_status, "UNSUPPORTED")

    async def test_rolling_computed(self):
        result = await self.run_fields([candidate("최근 12개월 매출")], field(semantic="COMPUTED", sources=[source("REVENUE_SUM", "MYDATA", source_params={"months":12})]))
        self.assertTrue(result.fields[0].runtime_supported)

    async def test_bad_params(self):
        for params in ({"year":2025}, {"months":0}, {"months":True}, {"months":"12"}, {}):
            await self.invalid(response(field(semantic="COMPUTED", sources=[source("REVENUE_SUM", "MYDATA", source_params=params)])))

    async def test_direct_params_forbidden(self):
        await self.invalid(response(field(sources=[source(source_params={"months":12})])))

    async def test_direct_computed_mismatch(self):
        await self.invalid(response(field(sources=[source("BUSINESS_AGE_MONTHS")])))

    async def test_computed_direct_mismatch(self):
        await self.invalid(response(field(semantic="COMPUTED")))

    async def test_generated_multiple_sources(self):
        result = await self.run_fields([candidate("추진계획")], field(semantic="GENERATED", sources=[source("BUSINESS_CATEGORY"), source("PROGRAM_SUMMARY", "PROGRAM")], instruction="근거를 바탕으로 계획을 작성"))
        self.assertEqual(len(result.fields[0].analysis.sources), 2)
        self.assertFalse(result.fields[0].runtime_supported)

    async def test_generated_rag_stub(self):
        result = await self.run_fields([candidate("추진계획")], field(semantic="GENERATED", sources=[source("PROGRAM_RAG", "RAG", query_hint="사업 목적")]))
        self.assertFalse(result.fields[0].runtime_supported)

    async def test_generated_empty_review(self):
        await self.invalid(response(field(semantic="GENERATED", sources=[])))
        result = await self.run_fields([candidate()], field(semantic="GENERATED", sources=[], status="NEEDS_REVIEW"))
        self.assertEqual(result.fields[0].analysis.mapping_status, "NEEDS_REVIEW")

    async def test_ignore_examples(self):
        for label in ("참고자료", "서식1"):
            result = await self.run_fields([candidate(label)], field(semantic="IGNORE", sources=[], key=None, value_type=None))
            self.assertIsNone(result.fields[0].analysis.field_key)

    async def test_ignore_sources_forbidden(self):
        await self.invalid(response(field(semantic="IGNORE", key=None)))

    async def test_user_input_sources_forbidden(self):
        await self.invalid(response(field(semantic="USER_INPUT")))

    async def test_resolved_requires_sources(self):
        await self.invalid(response(field(sources=[])))

    async def test_missing_candidate(self):
        await self.invalid(response())

    async def test_unknown_candidate(self):
        await self.invalid(response(field(cid="unknown")))

    async def test_duplicate_candidate(self):
        await self.invalid(response(field(), field()))

    async def test_invalid_enum(self):
        await self.invalid(response(field(semantic="MAGIC")))

    async def test_malformed_retry(self):
        client = FakeClient("not json", response(field()))
        result = await GmsSchemaAnalyzer(client=client).analyze([candidate()])
        self.assertEqual(len(result.fields), 1)
        self.assertEqual(len(client.calls), 2)
        self.assertIn("JSON_FORMAT", client.calls[1]["user_payload"])

    async def test_validation_retry(self):
        client = FakeClient(response(field(cid="unknown")), response(field()))
        await GmsSchemaAnalyzer(client=client).analyze([candidate()])
        self.assertIn("CANDIDATE_ID_SET_MISMATCH", client.calls[1]["user_payload"])

    async def test_two_failures_error(self):
        await self.invalid("bad json")

    async def test_candidate_order(self):
        result = await self.run_fields([candidate(cid="a"), candidate(cid="b")], field(cid="b"), field(cid="a"))
        self.assertEqual([i.analysis.candidate_id for i in result.fields], ["a", "b"])

    async def test_duplicate_field_keys(self):
        candidates = [candidate(cid=str(i)) for i in range(3)]
        result = await self.run_fields(candidates, *(field(cid=str(i)) for i in range(3)))
        self.assertEqual([i.analysis.field_key for i in result.fields], ["business_name", "business_name_2", "business_name_3"])

    async def test_preexisting_suffix_collision(self):
        result = await self.run_fields([candidate(cid=str(i)) for i in range(3)], field(cid="0"), field(cid="1"), field(cid="2", key="business_name_2"))
        self.assertEqual([i.analysis.field_key for i in result.fields], ["business_name", "business_name_3", "business_name_2"])

    async def test_original_location_and_label_preserved(self):
        original = candidate("업 체 명", hints={"unit":"원", "insertion_mode":"BEFORE_SUFFIX"})
        before = original.model_dump_json()
        result = await self.run_fields([original], field(field_label="변경된 label"))
        joined = result.fields[0]
        self.assertEqual(joined.analysis.field_label, original.label)
        self.assertEqual(joined.candidate.target_location, original.target_location)
        joined.candidate.target_location.native_ref["element_path"].append(99)
        self.assertEqual(original.model_dump_json(), before)

    async def test_compact_input_no_locations(self):
        original = candidate(context="x"*900, hints={"native_ref":{"secret":"path"}, "unit":"원"})
        client = FakeClient(response(field()))
        await GmsSchemaAnalyzer(client=client).analyze([original])
        payload = json.loads(client.calls[0]["user_payload"])["candidates"][0]
        self.assertEqual(len(payload["context"]), MAX_CONTEXT_LENGTH)
        self.assertEqual(len(original.context), 900)
        self.assertNotIn("location", client.calls[0]["user_payload"])
        self.assertNotIn("native_ref", client.calls[0]["user_payload"])
        self.assertEqual(payload["hints"], {"unit":"원"})

    async def test_llm_location_forbidden(self):
        await self.invalid(response(field(target_location={"row":1})))

    async def test_empty_list_no_call(self):
        client = FakeClient()
        result = await GmsSchemaAnalyzer(client=client).analyze([])
        self.assertEqual(result.fields, [])
        self.assertEqual(client.calls, [])

    async def test_duplicate_input_no_call(self):
        client = FakeClient()
        with self.assertRaises(SchemaAnalysisError):
            await GmsSchemaAnalyzer(client=client).analyze([candidate(), candidate()])
        self.assertEqual(client.calls, [])

    async def test_confidence_range(self):
        for score in (-1, 1.1, float("nan"), float("inf")):
            value = field(); value["confidence"] = score
            await self.invalid(response(value))

    async def test_field_key_pattern(self):
        await self.invalid(response(field(key="Bad Key")))

    async def test_code_fence(self):
        client = FakeClient("```json\n" + response(field()) + "\n```")
        result = await GmsSchemaAnalyzer(client=client).analyze([candidate()])
        self.assertEqual(len(result.fields), 1)

    async def test_duplicate_json_property(self):
        await self.invalid('{"fields":[],"fields":[]}')

    async def test_transport_error_no_retry_no_leak(self):
        client = Mock(analyze=AsyncMock(side_effect=RuntimeError("secret-api-key")))
        with self.assertRaises(SchemaAnalysisError) as caught:
            await GmsSchemaAnalyzer(client=client).analyze([candidate()])
        self.assertNotIn("secret", str(caught.exception))
        self.assertEqual(client.analyze.await_count, 1)

    def test_actual_catalog(self):
        catalog = SourceCatalog(); registry = build_registry()
        self.assertEqual(set(catalog.entries), set(SourceKey))
        for key, entry in catalog.entries.items():
            self.assertEqual(entry.source_type, registry.get(key).source_type)
            self.assertEqual(entry.field_type, registry.get(key).field_type)
        self.assertNotIn(SourceType.ACCOUNT, [e.source_type for e in catalog.entries.values()])

    async def test_gms_adapter_reuses_client(self):
        create = AsyncMock(return_value=types.SimpleNamespace(choices=[types.SimpleNamespace(
            finish_reason="stop", message=types.SimpleNamespace(content=response(field())))]))
        shared = Mock(); shared.with_options.return_value.chat.completions.create = create
        module = types.ModuleType("app.core.gms"); module.get_client = Mock(return_value=shared); module.DEFAULT_MODEL="test-model"
        core = types.ModuleType("app.core"); core.gms = module
        with patch.dict(sys.modules, {"app.core":core,"app.core.gms":module}):
            raw = await GmsSchemaAnalyzerClient().analyze(system_prompt="system",user_payload="input")
        self.assertEqual(raw,response(field()))
        shared.with_options.assert_called_once_with(timeout=60.0,max_retries=0)
        self.assertEqual(create.call_args.kwargs["response_format"], {"type":"json_object"})

    async def test_adapter_does_not_log_key(self):
        module = types.ModuleType("app.core.gms"); module.get_client=Mock(side_effect=RuntimeError("secret-api-key"))
        core=types.ModuleType("app.core"); core.gms=module
        with patch.dict(sys.modules, {"app.core":core,"app.core.gms":module}), self.assertNoLogs(level=logging.DEBUG):
            with self.assertRaises(SchemaAnalysisError) as caught:
                await GmsSchemaAnalyzerClient().analyze(system_prompt="",user_payload="")
        self.assertNotIn("secret-api-key",str(caught.exception))


if __name__ == "__main__":
    unittest.main()
