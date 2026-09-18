import copy
import io
import json
from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest, DocumentRuntimeError
from app.agent.documents.runtime.models import RuntimeFieldSchema, RuntimeTemplate
from app.agent.documents.runtime.repository import RuntimeRepository
from app.agent.sources.errors import SourceError
from app.agent.sources.models import SourceResolveResult


LOCATION = {"version": 1, "input_shape": "NUMBER", "current_text": "원",
            "hints": {"insertion_mode": "BEFORE_SUFFIX", "unit": "원"},
            "target_location": {"section_index": 0, "native_ref": {"element_path": [0, 1, 2], "nested": [None, {"x": True}]}}}


def source(key="BUSINESS_NAME", type="BUSINESS", priority=1, id=10, **kwargs):
    return dict(id=id, source_type=type, source_key=key, required=True, priority=priority, **kwargs)


def field(key="business_name", type="DIRECT", status="RESOLVED", sources=None, required=True, order=0, id=1, **kwargs):
    return RuntimeFieldSchema(id=id, field_key=key, field_label="기업명", field_order=order,
        field_type=type, value_type=kwargs.pop("value_type", "TEXT"), mapping_status=status,
        required=required, location_info=copy.deepcopy(LOCATION),
        sources=[source()] if sources is None else sources, **kwargs)


def template(*fields, status="COMPLETED"):
    return RuntimeTemplate(template_id=1, program_document_id=2, support_program_id=3,
        document_type="작성용", parse_status=status, schema_version=7,
        normalized_format="HWPX", normalized_path="normalized/example.hwpx", fields=list(fields))


def value(data="기업", found=True, key="BUSINESS_NAME", type="BUSINESS"):
    return SourceResolveResult(source_type=type, source_key=key, value=data, found=found)


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.repository = SimpleNamespace(load=AsyncMock(return_value=template(field())))
        self.resolver = SimpleNamespace(resolve_source=AsyncMock(return_value=value()))
        self.runtime = DocumentAgentRuntime(repository=self.repository, source_resolver=self.resolver)

    async def resolve(self):
        return await self.runtime.resolve(DocumentRuntimeRequest(template_id=1, user_id=9))

    async def test_direct_context_provenance(self):
        result = await self.resolve()
        resolved = result.fields[0]
        self.assertEqual((resolved.value, resolved.runtime_status), ("기업", "RESOLVED"))
        self.assertEqual((resolved.source_type, resolved.source_key, resolved.source_priority), ("BUSINESS", "BUSINESS_NAME", 1))
        context, query = self.resolver.resolve_source.call_args.args
        self.assertEqual((context.user_id, context.support_program_id), (9, 3))
        self.assertEqual(query.source_key, "BUSINESS_NAME")
        self.assertTrue(result.ready_for_write)
        self.assertEqual(result.schema_version, 7)

    async def test_template_not_found(self):
        self.repository.load.side_effect = DocumentRuntimeError("TEMPLATE_NOT_FOUND")
        with self.assertRaises(DocumentRuntimeError):
            await self.resolve()
        self.resolver.resolve_source.assert_not_called()

    async def test_non_completed_templates(self):
        for status in ("FAILED", "PARSING", "PENDING"):
            self.repository.load.return_value = template(field(), status=status)
            with self.assertRaises(DocumentRuntimeError) as caught:
                await self.resolve()
            self.assertEqual(caught.exception.code, "TEMPLATE_NOT_COMPLETED")
        self.resolver.resolve_source.assert_not_called()

    async def test_submission_document(self):
        self.repository.load.return_value.document_type = "제출용"
        with self.assertRaises(DocumentRuntimeError):
            await self.resolve()

    async def test_field_order(self):
        self.repository.load.return_value = template(field("last", order=9, id=4), field("first", order=0))
        result = await self.resolve()
        self.assertEqual([f.field_key for f in result.fields], ["first", "last"])

    async def test_source_priority_fallback(self):
        self.repository.load.return_value = template(field(sources=[source("USER_NAME", "USER", 2, 12), source(priority=1)]))
        self.resolver.resolve_source.side_effect = [value(None, False), value("성명", key="USER_NAME", type="USER")]
        result = await self.resolve()
        self.assertEqual([call.args[1].source_key for call in self.resolver.resolve_source.call_args_list], ["BUSINESS_NAME", "USER_NAME"])
        self.assertEqual((result.fields[0].value, result.fields[0].source_priority), ("성명", 2))

    async def test_first_success_stops(self):
        self.repository.load.return_value = template(field(sources=[source(), source(priority=2, id=11)]))
        await self.resolve()
        self.resolver.resolve_source.assert_awaited_once()

    async def test_all_missing(self):
        self.repository.load.return_value = template(field(sources=[source(), source(priority=2, id=11)]))
        self.resolver.resolve_source.return_value = value(None, False)
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "VALUE_MISSING")
        self.assertEqual(result.fields[0].field_type, "DIRECT")
        self.assertFalse(result.ready_for_write)
        self.assertEqual(self.resolver.resolve_source.await_count, 2)

    async def test_missing_definition(self):
        self.repository.load.return_value = template(field(sources=[]))
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "ERROR")
        self.assertEqual(result.fields[0].error_code, "MISSING_SOURCE_DEFINITION")

    async def test_exception_isolated(self):
        self.repository.load.return_value = template(field("first"), field("next", order=1, id=2))
        self.resolver.resolve_source.side_effect = [RuntimeError("SECRET password"), value()]
        result = await self.resolve()
        self.assertEqual([f.runtime_status for f in result.fields], ["ERROR", "RESOLVED"])
        self.assertNotIn("SECRET", result.model_dump_json())

    async def test_source_error_no_fallback(self):
        self.repository.load.return_value = template(field(sources=[source(), source(priority=2, id=11)]))
        self.resolver.resolve_source.side_effect = SourceError("SOURCE_SYSTEM_ERROR", "private")
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "ERROR")
        self.assertEqual(result.fields[0].error_code, "SOURCE_SYSTEM_ERROR")
        self.resolver.resolve_source.assert_awaited_once()

    async def test_resolver_unsupported(self):
        self.resolver.resolve_source.side_effect = SourceError("SOURCE_NOT_IMPLEMENTED", "not implemented")
        self.assertEqual((await self.resolve()).fields[0].runtime_status, "UNSUPPORTED")

    async def test_mapping_needs_review(self):
        self.repository.load.return_value = template(field(status="NEEDS_REVIEW"))
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "NEEDS_REVIEW")
        self.assertFalse(result.ready_for_write)
        self.resolver.resolve_source.assert_not_called()

    async def test_mapping_unsupported(self):
        self.repository.load.return_value = template(field(status="UNSUPPORTED"))
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "UNSUPPORTED")
        self.assertFalse(result.ready_for_write)
        self.resolver.resolve_source.assert_not_called()

    async def test_user_input_left_blank(self):
        self.repository.load.return_value = template(field("bank_name", "USER_INPUT", sources=[]))
        result = await self.resolve()
        self.assertIsNone(result.fields[0].value)
        self.assertEqual(result.fields[0].runtime_status, "LEFT_BLANK")
        self.assertTrue(result.ready_for_write)
        self.resolver.resolve_source.assert_not_called()

    async def test_user_input_required_and_optional(self):
        for required in (True, False):
            self.repository.load.return_value = template(field("name", "USER_INPUT", sources=[], required=required))
            result = await self.resolve()
            self.assertEqual(result.fields[0].runtime_status, "LEFT_BLANK")
            self.assertIsNone(result.fields[0].value)
            self.assertTrue(result.ready_for_write)

    async def test_removed_user_inputs_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            DocumentRuntimeRequest(template_id=1,user_id=9,user_inputs={"consent":True})
        self.resolver.resolve_source.assert_not_called()

    async def test_request_only_ids(self):
        self.assertEqual(DocumentRuntimeRequest(template_id=1,user_id=9).model_dump(), {"template_id":1,"user_id":9})

    async def test_computed_non_computed_source_unsupported(self):
        self.repository.load.return_value = template(field(type="COMPUTED", instruction="keep", constraints={"x": [1]}, min_length=2))
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "UNSUPPORTED")
        self.assertEqual(result.fields[0].instruction, "keep")
        self.assertEqual(result.fields[0].constraints, {"x": [1]})
        self.assertEqual(len(result.fields[0].sources), 1)
        self.resolver.resolve_source.assert_not_called()

    async def test_generated_missing_source(self):
        self.repository.load.return_value = template(field(type="GENERATED", sources=[]))
        self.assertEqual((await self.resolve()).fields[0].error_code, "MISSING_SOURCE_DEFINITION")
        self.resolver.resolve_source.assert_not_called()

    async def test_user_input_always_blank_computed_mapping_gate(self):
        self.repository.load.return_value = template(field("name", "USER_INPUT", status="NEEDS_REVIEW", sources=[]), field("amount", "COMPUTED", status="UNSUPPORTED", id=2, order=1))
        result = await self.resolve()
        self.assertEqual([f.runtime_status for f in result.fields], ["LEFT_BLANK", "UNSUPPORTED"])
        self.assertIsNone(result.fields[0].value)

    async def test_rag_never_called(self):
        self.repository.load.return_value = template(field(sources=[source("PROGRAM_RAG", "RAG")]))
        result = await self.resolve()
        self.assertEqual(result.fields[0].runtime_status, "UNSUPPORTED")
        self.resolver.resolve_source.assert_not_called()

    async def test_unknown_source_key(self):
        self.repository.load.return_value = template(field(sources=[source("FUTURE_KEY")]))
        self.assertEqual((await self.resolve()).fields[0].runtime_status, "UNSUPPORTED")
        self.resolver.resolve_source.assert_not_called()

    async def test_location_roundtrip_and_input_unchanged(self):
        before = self.repository.load.return_value.model_dump()
        result = await self.resolve()
        self.assertEqual(result.fields[0].location_info, LOCATION)
        result.fields[0].location_info["target_location"]["native_ref"]["element_path"].append(5)
        self.assertEqual(self.repository.load.return_value.model_dump(), before)

    async def test_optional_unresolved_and_counts(self):
        self.repository.load.return_value = template(field("business_name"), field("optional", "USER_INPUT", required=False, sources=[], id=2, order=1))
        result = await self.resolve()
        self.assertTrue(result.ready_for_write)
        self.assertEqual(result.total_fields, 2)
        self.assertEqual(result.status_counts["RESOLVED"], 1)
        self.assertEqual(result.status_counts["LEFT_BLANK"], 1)
        self.assertEqual(sum(result.status_counts.values()), 2)

    async def test_empty_schema(self):
        self.repository.load.return_value = template()
        result = await self.resolve()
        self.assertEqual(result.total_fields, 0)
        self.assertTrue(result.ready_for_write)

    async def test_user_input_types_always_blank(self):
        for type_ in ("TEXT", "NUMBER", "BOOLEAN", "DATE", "JSON"):
            with self.subTest(type=type_):
                self.repository.load.return_value = template(field("input", "USER_INPUT", value_type=type_, sources=[]))
                result = await self.resolve()
                self.assertEqual(result.fields[0].runtime_status, "LEFT_BLANK")
                self.assertIsNone(result.fields[0].value)

    async def test_source_typed_values_not_formatted(self):
        for supplied in (date(2026, 9, 17), Decimal("123.40"), 0, False, [], "  "):
            self.resolver.resolve_source.return_value = value(supplied)
            resolved = (await self.resolve()).fields[0]
            self.assertEqual(resolved.value, supplied)
            self.assertIs(type(resolved.value), type(supplied))
            self.assertEqual(resolved.runtime_status, "RESOLVED")

    async def test_source_params_preserved(self):
        self.repository.load.return_value = template(field(sources=[source("REVENUE_SUM", "MYDATA", source_params={"months": 12})]))
        self.resolver.resolve_source.return_value = value(500, key="REVENUE_SUM", type="MYDATA")
        result = await self.resolve()
        self.assertEqual(result.fields[0].value, 500)
        self.assertEqual(self.resolver.resolve_source.call_args.args[1].source_params, {"months": 12})

    async def test_schema_load_error(self):
        self.repository.load.side_effect = RuntimeError("connection password")
        with self.assertRaises(DocumentRuntimeError) as caught:
            await self.resolve()
        self.assertEqual(caught.exception.code, "SCHEMA_LOAD_FAILED")
        self.assertNotIn("password", str(caught.exception))

    async def test_invalid_source_result(self):
        self.resolver.resolve_source.return_value = value(None, True)
        self.assertEqual((await self.resolve()).fields[0].error_code, "INVALID_SOURCE_RESULT")

    async def test_resolver_public_api_with_fake_provider(self):
        from app.agent.sources.service import SourceService
        from app.agent.sources.provider import SourceData
        provider = SimpleNamespace(fetch=AsyncMock(return_value=SourceData(values={"BUSINESS_NAME": "원문 기업"})))
        self.runtime.source_resolver = SourceService(provider)
        self.assertEqual((await self.resolve()).fields[0].value, "원문 기업")


class RepositoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.queries = []
        self.active = False
        self.data = template(field()).model_dump()
        self.field = self.data.pop("fields")[0]
        self.sources = [{**s, "field_schema_id": self.field["id"]} for s in self.field.pop("sources")]
        owner = self
        class Connection:
            @asynccontextmanager
            async def transaction(self):
                owner.active = True
                try:
                    yield
                finally:
                    owner.active = False
            async def execute(self, sql, params=None):
                owner.assertTrue(owner.active)
                owner.queries.append((sql, params))
                if "FROM document_template" in sql:
                    return SimpleNamespace(fetchone=AsyncMock(return_value=owner.data))
                if "FROM document_field_schema WHERE" in sql:
                    return SimpleNamespace(fetchall=AsyncMock(return_value=[owner.field]))
                return SimpleNamespace(fetchall=AsyncMock(return_value=owner.sources))
        @asynccontextmanager
        async def acquire():
            yield Connection()
        self.repository = RuntimeRepository(acquire)

    async def test_read_snapshot_three_queries_no_n_plus_one(self):
        loaded = await self.repository.load(1)
        self.assertEqual(len(self.queries), 4)  # SET TRANSACTION + 3 SELECTs
        self.assertIn("REPEATABLE READ, READ ONLY", self.queries[0][0])
        self.assertIn("ORDER BY field_order, id", self.queries[2][0])
        self.assertIn("ORDER BY s.priority, s.id", self.queries[3][0])
        self.assertEqual(loaded.fields[0].location_info, LOCATION)
        self.assertEqual(loaded.fields[0].sources[0].source_key, "BUSINESS_NAME")
        self.assertFalse(self.active)

    async def test_failed_template_no_schema_reads(self):
        self.data["parse_status"] = "FAILED"
        with self.assertRaises(DocumentRuntimeError) as caught:
            await self.repository.load(1)
        self.assertEqual(caught.exception.code, "TEMPLATE_NOT_COMPLETED")
        self.assertEqual(len(self.queries), 2)

    async def test_missing_template(self):
        self.data = None
        with self.assertRaises(DocumentRuntimeError) as caught:
            await self.repository.load(1)
        self.assertEqual(caught.exception.code, "TEMPLATE_NOT_FOUND")

    async def test_source_definition_load_preserves_json(self):
        self.sources[0]["source_params"] = {"nested": [None, {"x": True}]}
        loaded = await self.repository.load(1)
        self.assertEqual(loaded.fields[0].sources[0].source_params, self.sources[0]["source_params"])


class RuntimeCliTests(unittest.TestCase):
    def result(self):
        return SimpleNamespace(template_id=1, program_document_id=2, total_fields=1,
            ready_for_write=True, status_counts={"RESOLVED": 1}, fields=[SimpleNamespace(
                field_key="name", runtime_status="RESOLVED", error_code=None, value="SECRET")],
            model_dump_json=lambda **kwargs: '{"value":"SECRET"}')

    def test_default_output_hides_values(self):
        from app.agent.documents.runtime.__main__ import main
        with patch("sys.argv", ["runtime", "1", "9"]), patch(
            "app.agent.documents.runtime.__main__.run", new=AsyncMock(return_value=self.result())
        ), patch("sys.stdout", new_callable=io.StringIO) as output:
            self.assertEqual(main(), 0)
            self.assertNotIn("SECRET", output.getvalue())
            self.assertTrue(json.loads(output.getvalue())["ready_for_write"])

    def test_explicit_show_values(self):
        from app.agent.documents.runtime.__main__ import main
        with patch("sys.argv", ["runtime", "1", "9", "--show-values"]), patch(
            "app.agent.documents.runtime.__main__.run", new=AsyncMock(return_value=self.result())
        ), patch("sys.stdout", new_callable=io.StringIO) as output:
            self.assertEqual(main(), 0)
            self.assertIn("SECRET", output.getvalue())

    def test_cli_error_is_safe(self):
        from app.agent.documents.runtime.__main__ import main
        with patch("sys.argv", ["runtime", "1", "9"]), patch(
            "app.agent.documents.runtime.__main__.run", new=AsyncMock(side_effect=RuntimeError("SECRET"))
        ), patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(main(), 1)
            self.assertNotIn("SECRET", output.getvalue())
