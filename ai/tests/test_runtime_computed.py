import copy
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from test_document_runtime import field, source, template, value, LOCATION
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest
from app.agent.documents.runtime.computed import ComputedExecutor
from app.agent.sources.service import SourceService
from app.agent.sources.provider import SourceData, MonthlyAmounts
from app.agent.sources.errors import SourceError
from app.agent.documents.schema_analyzer.enums import FieldValueType


def computed(**kwargs):
    return field(type="COMPUTED", value_type="NUMBER", sources=kwargs.pop("sources", [source(
        "REVENUE_SUM", "MYDATA", source_params={"months": 2})]), **kwargs)


class ComputedTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.repository = SimpleNamespace(load=AsyncMock(return_value=template(computed())))
        self.resolver = SimpleNamespace(resolve_source=AsyncMock(return_value=value(100, key="REVENUE_SUM", type="MYDATA")))
        self.runtime = DocumentAgentRuntime(repository=self.repository, source_resolver=self.resolver)

    async def run_runtime(self):
        return await self.runtime.resolve(DocumentRuntimeRequest(template_id=1, user_id=9))

    async def test_existing_source_resolved(self):
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].value, 100)
        self.assertTrue(result.ready_for_write)
        self.assertEqual(result.fields[0].runtime_status, "RESOLVED")
        self.assertEqual(result.fields[0].field_type, "COMPUTED")
        context, request = self.resolver.resolve_source.call_args.args
        self.assertEqual(context.user_id, 9)
        self.assertEqual(request.source_params, {"months": 2})

    async def test_real_resolver_supported_computations(self):
        data = SourceData(values={"OPEN_DATE": date(2025, 9, 17), "INSURANCE_LIST": [{"name": "insurance"}]},
            monthly_amounts=[MonthlyAmounts(date(2026, 7, 1), 101, 11), MonthlyAmounts(date(2026, 8, 1), 200, 20)])
        provider = SimpleNamespace(fetch=AsyncMock(return_value=data))
        self.runtime.source_resolver = SourceService(provider, today=lambda: date(2026, 9, 17))
        for key, type_, params, value_type, expected in [
            ("REVENUE_SUM", "MYDATA", {"months": 2}, "NUMBER", 301),
            ("REVENUE_AVERAGE", "MYDATA", {"months": 2}, "NUMBER", Decimal("150.5")),
            ("TAX_SUM", "MYDATA", {"months": 2}, "NUMBER", 31),
            ("TAX_AVERAGE", "MYDATA", {"months": 2}, "NUMBER", Decimal("15.5")),
            ("BUSINESS_AGE_MONTHS", "BUSINESS", {}, "NUMBER", 12),
            ("INSURANCE_ENROLLED", "MYDATA", {}, "BOOLEAN", True),
        ]:
            with self.subTest(key=key):
                self.repository.load.return_value = template(field(type="COMPUTED", value_type=value_type,
                    sources=[source(key, type_, source_params=params)]))
                result = await self.run_runtime()
                self.assertEqual(result.fields[0].runtime_status, "RESOLVED")
                self.assertEqual(result.fields[0].value, expected)
                self.assertIs(type(result.fields[0].value), type(expected))

    async def test_decimal_preserved(self):
        amount = Decimal("12345678901234567890.1234567890123456789")
        self.resolver.resolve_source.return_value = value(amount, key="REVENUE_SUM", type="MYDATA")
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].value, amount)
        self.assertIsInstance(result.fields[0].value, Decimal)

    async def test_operand_missing(self):
        self.resolver.resolve_source.return_value = value(None, False, key="REVENUE_SUM", type="MYDATA")
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].runtime_status, "VALUE_MISSING")
        self.assertFalse(result.ready_for_write)

    async def test_definition_missing(self):
        self.repository.load.return_value = template(computed(sources=[]))
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].error_code, "COMPUTATION_DEFINITION_MISSING")
        self.assertEqual(result.fields[0].runtime_status, "VALUE_MISSING")
        self.resolver.resolve_source.assert_not_called()

    async def test_instruction_not_interpreted(self):
        self.repository.load.return_value = template(computed(sources=[], instruction="운반비의 50%, 최대 500만원"))
        self.assertEqual((await self.run_runtime()).fields[0].runtime_status, "VALUE_MISSING")
        self.resolver.resolve_source.assert_not_called()

    async def test_fake_constraints_contract_not_adopted(self):
        self.repository.load.return_value = template(computed(sources=[], constraints={
            "operation": "MULTIPLY_RATE", "rate": "0.5", "operand_field_key": "transport_cost"}))
        self.assertEqual((await self.run_runtime()).fields[0].runtime_status, "VALUE_MISSING")

    async def test_multiple_sources_ambiguous_no_fallback(self):
        self.repository.load.return_value = template(computed(sources=[
            source("REVENUE_SUM", "MYDATA", priority=2, source_params={"months": 2}),
            source("TAX_SUM", "MYDATA", priority=1, id=11, source_params={"months": 2})]))
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].runtime_status, "VALUE_MISSING")
        self.assertEqual([s.priority for s in result.fields[0].sources], [1, 2])
        self.resolver.resolve_source.assert_not_called()

    async def test_unknown_operation(self):
        self.repository.load.return_value = template(computed(sources=[source("MULTIPLY_RATE", "MYDATA")]))
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].runtime_status, "UNSUPPORTED")
        self.assertFalse(result.ready_for_write)
        self.resolver.resolve_source.assert_not_called()

    async def test_malformed_params(self):
        for params in ({}, {"months": 0}, {"months": True}, {"months": 2, "rate": "0.5"}, {"field_key": "transport_cost"}):
            self.repository.load.return_value = template(computed(sources=[source("REVENUE_SUM", "MYDATA", source_params=params)]))
            result = await self.run_runtime()
            self.assertEqual(result.fields[0].runtime_status, "ERROR")
            self.assertEqual(result.fields[0].error_code, "INVALID_COMPUTATION_PARAMS")
        self.resolver.resolve_source.assert_not_called()

    async def test_invalid_numeric_values(self):
        for supplied in (True, 1.5, "100", Decimal("NaN"), Decimal("Infinity"), None):
            # Bypass source model checks only to test Executor's defensive validation.
            self.resolver.resolve_source.return_value = SimpleNamespace(source_key="REVENUE_SUM", source_type="MYDATA", found=True, value=supplied)
            result = await self.run_runtime()
            self.assertEqual(result.fields[0].runtime_status, "ERROR")
            self.assertFalse(result.ready_for_write)

    async def test_calculation_exception_isolated(self):
        self.repository.load.return_value = template(computed(), field("next", id=2, order=1))
        self.resolver.resolve_source.side_effect = [RuntimeError("SECRET"), value("기업")]
        result = await self.run_runtime()
        self.assertEqual([f.runtime_status for f in result.fields], ["ERROR", "RESOLVED"])
        self.assertNotIn("SECRET", result.model_dump_json())

    async def test_executor_exception_isolated(self):
        with patch.object(ComputedExecutor, "execute", side_effect=ArithmeticError("private")):
            self.assertEqual((await self.run_runtime()).fields[0].runtime_status, "ERROR")

    async def test_mapping_gates_executor(self):
        for status in ("NEEDS_REVIEW", "UNSUPPORTED"):
            self.repository.load.return_value = template(computed(status=status))
            with patch.object(ComputedExecutor, "prepare", side_effect=AssertionError("must not execute")) as method:
                result = await self.run_runtime()
                self.assertEqual(result.fields[0].runtime_status, status)
                self.assertFalse(result.ready_for_write)
                method.assert_not_called()

    async def test_location_provenance_preserved(self):
        before = copy.deepcopy(self.repository.load.return_value.model_dump())
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].location_info, LOCATION)
        self.assertEqual((result.fields[0].source_type, result.fields[0].source_key, result.fields[0].source_priority), ("MYDATA", "REVENUE_SUM", 1))
        self.assertEqual(self.repository.load.return_value.model_dump(), before)

    async def test_optional_missing(self):
        self.repository.load.return_value = template(computed(sources=[], required=False))
        self.assertTrue((await self.run_runtime()).ready_for_write)

    async def test_rag_unsupported_no_call(self):
        self.repository.load.return_value = template(computed(sources=[source("PROGRAM_RAG", "RAG")]))
        self.assertEqual((await self.run_runtime()).fields[0].runtime_status, "UNSUPPORTED")
        self.resolver.resolve_source.assert_not_called()

    async def test_source_error(self):
        self.resolver.resolve_source.side_effect = SourceError("CALCULATION_IMPOSSIBLE", "private")
        result = await self.run_runtime()
        self.assertEqual(result.fields[0].runtime_status, "ERROR")
        self.assertEqual(result.fields[0].error_code, "CALCULATION_IMPOSSIBLE")

    async def test_value_type_mismatch(self):
        self.repository.load.return_value.fields[0].value_type = FieldValueType.TEXT
        self.assertEqual((await self.run_runtime()).fields[0].error_code, "INVALID_COMPUTATION_VALUE_TYPE")
        self.resolver.resolve_source.assert_not_called()
