"""외부 DB/모델/네트워크 없이 실행하는 문서 Source 단위 테스트."""

import unittest
from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal

from pydantic import ValidationError

from app.agent.sources.defaults import build_registry
from app.agent.sources.enums import SourceKey as K, SourceType as T
from app.agent.sources.errors import SourceError
from app.agent.sources.models import SourceResolveContext, SourceResolveRequest, SourceResolveResult
from app.agent.sources.postgres import (
    BUSINESS_FIELDS, PROGRAM_FIELDS, USER_FIELDS, PostgresDataProvider,
)
from app.agent.sources.provider import MonthlyAmounts, SourceData
from app.agent.sources.registry import SourceRegistry
from app.agent.sources.service import SourceService


def request(key, source_type=T.BUSINESS, **params):
    return SourceResolveRequest(source_type=source_type, source_key=key, source_params=params)


class FakeProvider:
    def __init__(self):
        self.calls = []
        self.error = None
        self.data = SourceData(values={
            K.BUSINESS_NAME: "안동 제과점", K.BUSINESS_CATEGORY: "제과점",
            K.EMPLOYEE_COUNT: 2, K.OPEN_DATE: date(2024, 6, 16),
        })

    async def fetch(self, source_type, context, **kwargs):
        self.calls.append((source_type, context, kwargs))
        if self.error:
            raise self.error
        return self.data


class ResolverTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.provider = FakeProvider()
        self.context = SourceResolveContext(user_id=1)
        self.service = SourceService(self.provider, today=lambda: date(2026, 9, 15))

    async def resolve(self, key, source_type=T.BUSINESS, **params):
        return await self.service.resolve_source(self.context, request(key, source_type, **params))

    async def test_business_name(self):
        value = await self.resolve(K.BUSINESS_NAME)
        self.assertEqual(value.value, "안동 제과점")
        self.assertTrue(value.found)
        self.assertEqual(value.metadata["field_type"], "DIRECT")

    async def test_business_age_before_anniversary(self):
        value = await self.resolve(K.BUSINESS_AGE_MONTHS)
        self.assertEqual(value.value, 26)
        self.assertEqual(value.metadata["field_type"], "COMPUTED")

    async def test_business_age_on_anniversary_and_future(self):
        self.provider.data.values[K.OPEN_DATE] = date(2024, 6, 15)
        self.assertEqual((await self.resolve(K.BUSINESS_AGE_MONTHS)).value, 27)
        self.provider.data.values[K.OPEN_DATE] = date(2026, 10, 1)
        with self.assertRaises(SourceError) as caught:
            await self.resolve(K.BUSINESS_AGE_MONTHS)
        self.assertEqual(caught.exception.code, "CALCULATION_IMPOSSIBLE")

    def months(self, count):
        self.provider.data.monthly_amounts = [
            MonthlyAmounts(date((2026 * 12 + 8 - i) // 12,
                                (2026 * 12 + 8 - i) % 12 + 1, 1), 100, 10)
            for i in range(1, count + 1)
        ]

    async def test_revenue_sum_12_and_window(self):
        self.months(12)
        value = await self.resolve(K.REVENUE_SUM, T.MYDATA, months=12)
        self.assertEqual(value.value, 1200)
        self.assertEqual(self.provider.calls[-1][2], {
            "start": date(2025, 9, 1), "end": date(2026, 9, 1),
        })

    async def test_revenue_average_and_tax(self):
        self.months(6)
        self.provider.data.monthly_amounts[0] = MonthlyAmounts(date(2026, 8, 1), 103, 13)
        self.assertEqual((await self.resolve(K.REVENUE_AVERAGE, T.MYDATA, months=6)).value,
                         Decimal("100.5"))
        self.assertEqual((await self.resolve(K.TAX_SUM, T.MYDATA, months=6)).value, 63)
        self.assertEqual((await self.resolve(K.TAX_AVERAGE, T.MYDATA, months=6)).value,
                         Decimal("10.5"))

    async def test_invalid_months(self):
        for params in ({}, {"months": 0}, {"months": -1}, {"months": True},
                       {"months": "12"}, {"months": 1.2}, {"months": None},
                       {"months": 12, "unexpected": 1}, {"months": 999999}):
            with self.subTest(params=params), self.assertRaises(SourceError) as caught:
                await self.resolve(K.REVENUE_SUM, T.MYDATA, **params)
            self.assertEqual(caught.exception.code, "INVALID_SOURCE_PARAMS")
        self.assertEqual(self.provider.calls, [])

    async def test_missing_and_partial_months(self):
        self.assertFalse((await self.resolve(K.REVENUE_SUM, T.MYDATA, months=12)).found)
        self.months(5)
        with self.assertRaises(SourceError) as caught:
            await self.resolve(K.REVENUE_AVERAGE, T.MYDATA, months=6)
        self.assertEqual(caught.exception.code, "CALCULATION_IMPOSSIBLE")

    async def test_duplicate_months(self):
        self.months(2)
        self.provider.data.monthly_amounts[1] = self.provider.data.monthly_amounts[0]
        with self.assertRaises(SourceError) as caught:
            await self.resolve(K.TAX_SUM, T.MYDATA, months=2)
        self.assertEqual(caught.exception.code, "CALCULATION_IMPOSSIBLE")

    async def test_zero_is_found(self):
        self.provider.data.values[K.EMPLOYEE_COUNT] = 0
        self.assertTrue((await self.resolve(K.EMPLOYEE_COUNT)).found)

    async def test_entity_absence_distinguished(self):
        for code in ("USER_NOT_FOUND", "BUSINESS_NOT_FOUND", "PROGRAM_NOT_FOUND",
                     "MYDATA_NOT_FOUND"):
            self.provider.error = SourceError(code, "대상이 없습니다.", missing=True)
            value = await self.resolve(K.BUSINESS_NAME)
            self.assertFalse(value.found)
            self.assertEqual(value.metadata["code"], code)

    async def test_unregistered_key_and_type_mismatch(self):
        service = SourceService(self.provider, SourceRegistry())
        with self.assertRaises(SourceError) as caught:
            await service.resolve_source(self.context, request(K.BUSINESS_NAME))
        self.assertEqual(caught.exception.code, "UNSUPPORTED_SOURCE_KEY")
        with self.assertRaises(SourceError) as caught:
            await self.resolve(K.BUSINESS_NAME, T.USER)
        self.assertEqual(caught.exception.code, "SOURCE_TYPE_MISMATCH")

    async def test_unknown_string_rejected_by_model(self):
        with self.assertRaises(ValidationError):
            request("DOES_NOT_EXIST")

    async def test_batch_preserves_order_and_duplicates(self):
        self.months(12)
        sources = [
            request(K.BUSINESS_CATEGORY), request(K.EMPLOYEE_COUNT),
            request(K.BUSINESS_AGE_MONTHS), request(K.REVENUE_SUM, T.MYDATA, months=12),
            request(K.REVENUE_AVERAGE, T.MYDATA, months=12),
            request(K.BUSINESS_CATEGORY),
        ]
        values = await self.service.resolve_sources(self.context, sources)
        self.assertEqual([v.value for v in values], ["제과점", 2, 26, 1200, Decimal(100), "제과점"])
        self.assertEqual(await self.service.resolve_sources(self.context, []), [])

    async def test_system_error_redacted(self):
        self.provider.error = RuntimeError("SELECT private_password FROM secret_table")
        with self.assertRaises(SourceError) as caught:
            await self.resolve(K.BUSINESS_NAME)
        self.assertEqual(caught.exception.code, "SOURCE_SYSTEM_ERROR")
        self.assertNotIn("secret", str(caught.exception.as_dict()))

    async def test_insurance_empty_is_known_false(self):
        self.provider.data.values[K.INSURANCE_LIST] = []
        policies = await self.resolve(K.INSURANCE_LIST, T.MYDATA)
        enrolled = await self.resolve(K.INSURANCE_ENROLLED, T.MYDATA)
        self.assertEqual(policies.value, [])
        self.assertTrue(policies.found)
        self.assertIs(enrolled.value, False)
        self.assertTrue(enrolled.found)

    async def test_rag_is_interface_only(self):
        source = SourceResolveRequest(source_type=T.RAG, source_key=K.PROGRAM_RAG,
                                      query_hint="지원 대상")
        with self.assertRaises(SourceError) as caught:
            await self.service.resolve_source(self.context, source)
        self.assertEqual(caught.exception.code, "SOURCE_NOT_IMPLEMENTED")
        self.assertEqual(self.provider.calls, [])

    def test_all_enum_keys_registered(self):
        registry = build_registry()
        for key in K:
            self.assertIsNotNone(registry.get(key))
        with self.assertRaises(ValueError):
            registry.register(K.USER_NAME, registry.get(K.USER_NAME))

    def test_date_decimal_and_array_serialization(self):
        for value in (date(2026, 9, 15), Decimal("10.5"), [{"policy_id": 1}], False, 0):
            parsed = SourceResolveResult(source_type=T.USER, source_key=K.USER_NAME,
                                         value=value, found=True)
            self.assertEqual(parsed.value, value)
            self.assertIsInstance(parsed.model_dump_json(), str)


class FakeCursor:
    def __init__(self, value):
        self.value = value

    async def fetchone(self):
        return self.value

    async def fetchall(self):
        return self.value


class FakeConnection:
    def __init__(self, rows):
        self.rows = list(rows)
        self.calls = []

    async def execute(self, sql, params):
        self.calls.append((sql, params))
        return FakeCursor(self.rows.pop(0))


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    def service(self, rows):
        self.conn = FakeConnection(rows)

        @asynccontextmanager
        async def acquire():
            yield self.conn

        return SourceService(PostgresDataProvider(acquire), today=lambda: date(2026, 9, 15))

    def business_row(self):
        row = {key.value: None for key in BUSINESS_FIELDS}
        row.update(BUSINESS_NAME="상점", BUSINESS_BRN="123-45-67890")
        return row

    async def test_real_mapping_business(self):
        service = self.service([self.user_row(), [self.business_row()]])
        value = await service.resolve_source(SourceResolveContext(user_id=1), request(K.BUSINESS_NAME))
        self.assertEqual(value.value, "상점")
        self.assertEqual(self.conn.calls[1][1], (1,))
        self.assertIn("WHERE b.user_id = %s", self.conn.calls[1][0])
        self.assertIn("mc.id = b.business_code_id", self.conn.calls[1][0])

    async def test_real_missing_user_business_program(self):
        for kind, key, context, code in (
            (T.USER, K.USER_NAME, SourceResolveContext(user_id=1), "USER_NOT_FOUND"),
            (T.BUSINESS, K.BUSINESS_NAME, SourceResolveContext(user_id=1), "BUSINESS_NOT_FOUND"),
            (T.PROGRAM, K.PROGRAM_NAME, SourceResolveContext(support_program_id=3), "PROGRAM_NOT_FOUND"),
        ):
            rows = [self.user_row(), []] if kind == T.BUSINESS else [None]
            value = await self.service(rows).resolve_source(context, request(key, kind))
            self.assertFalse(value.found)
            self.assertEqual(value.metadata["code"], code)

    def user_row(self):
        return {key.value: "사용자" for key in USER_FIELDS}

    async def test_context_missing(self):
        for source in (request(K.BUSINESS_NAME), request(K.REVENUE_SUM, T.MYDATA, months=1),
                       request(K.INSURANCE_LIST, T.MYDATA)):
            with self.subTest(key=source.source_key), self.assertRaises(SourceError) as caught:
                await self.service([]).resolve_source(SourceResolveContext(), source)
            self.assertEqual(caught.exception.code, "MISSING_CONTEXT_ID")
            self.assertIn("user_id", caught.exception.message)
            self.assertEqual(self.conn.calls, [])

    async def test_multiple_businesses_are_integrity_error(self):
        for source in (request(K.BUSINESS_NAME), request(K.REVENUE_SUM, T.MYDATA, months=1),
                       request(K.INSURANCE_LIST, T.MYDATA)):
            rows = [self.user_row(), [self.business_row(), self.business_row()]]
            with self.subTest(key=source.source_key), self.assertRaises(SourceError) as caught:
                await self.service(rows).resolve_source(SourceResolveContext(user_id=1), source)
            self.assertEqual(caught.exception.code, "DATA_INTEGRITY_ERROR")
            self.assertEqual(len(self.conn.calls), 2)

    async def test_business_and_mydata_missing_user(self):
        for source in (request(K.BUSINESS_NAME), request(K.REVENUE_SUM, T.MYDATA, months=1),
                       request(K.INSURANCE_LIST, T.MYDATA)):
            value = await self.service([None]).resolve_source(SourceResolveContext(user_id=1), source)
            self.assertFalse(value.found)
            self.assertEqual(value.metadata["code"], "USER_NOT_FOUND")
            self.assertEqual(len(self.conn.calls), 1)

    async def test_mydata_missing_business(self):
        for source in (request(K.REVENUE_SUM, T.MYDATA, months=1),
                       request(K.INSURANCE_LIST, T.MYDATA)):
            value = await self.service([self.user_row(), []]).resolve_source(
                SourceResolveContext(user_id=1), source)
            self.assertFalse(value.found)
            self.assertEqual(value.metadata["code"], "BUSINESS_NOT_FOUND")
            self.assertEqual(len(self.conn.calls), 2)

    async def test_mydata_missing_link(self):
        value = await self.service([self.user_row(), [self.business_row()], None]).resolve_source(
            SourceResolveContext(user_id=1), request(K.REVENUE_SUM, T.MYDATA, months=1))
        self.assertFalse(value.found)
        self.assertEqual(value.metadata["code"], "MYDATA_NOT_FOUND")

    async def test_mydata_insurance_via_user(self):
        rows = [self.user_row(), [self.business_row()], {"id": 7},
                [{"policy_id": 9, "title": "보험"}]]
        value = await self.service(rows).resolve_source(
            SourceResolveContext(user_id=1), request(K.INSURANCE_LIST, T.MYDATA))
        self.assertEqual(value.value, [{"policy_id": 9, "title": "보험"}])
        self.assertEqual(self.conn.calls[1][1], (1,))
        self.assertEqual(self.conn.calls[2][1], ("123-45-67890",))
        self.assertEqual(self.conn.calls[3][1], (7,))

    def test_context_fields(self):
        self.assertEqual(set(SourceResolveContext.model_fields),
                         {"user_id", "support_program_id", "draft_date"})
        with self.assertRaises(ValidationError):
            SourceResolveContext(user_id=1, business_id=2)

    async def test_mydata_join_and_period_bounds(self):
        rows = [self.user_row(), [self.business_row()], {"id": 7},
                [{"period": date(2026, 8, 1), "revenue": 120, "tax": 10}]]
        value = await self.service(rows).resolve_source(
            SourceResolveContext(user_id=1), request(K.REVENUE_SUM, T.MYDATA, months=1))
        self.assertEqual(value.value, 120)
        self.assertEqual(self.conn.calls[2][1], ("123-45-67890",))
        self.assertEqual(self.conn.calls[3][1], (7, date(2026, 8, 1), date(2026, 9, 1)))

    async def test_program_and_user_fields(self):
        for kind, key, mapping, context in (
            (T.USER, K.USER_NAME, USER_FIELDS, SourceResolveContext(user_id=1)),
            (T.PROGRAM, K.PROGRAM_NAME, PROGRAM_FIELDS, SourceResolveContext(support_program_id=3)),
        ):
            row = {k.value: "value" for k in mapping}
            value = await self.service([row]).resolve_source(context, request(key, kind))
            self.assertEqual(value.value, "value")
            self.assertNotIn("SELECT", value.model_dump_json())


if __name__ == "__main__":
    unittest.main()

