"""Stored USER facts: real provider/resolver contracts with a fake DB connection."""
from contextlib import asynccontextmanager
from datetime import date
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

from test_document_sources import FakeConnection, request
from test_document_runtime import field, source, template
from app.agent.sources.enums import SourceKey as K, SourceType as T
from app.agent.sources.models import SourceResolveContext
from app.agent.sources.postgres import PostgresDataProvider, USER_FIELDS
from app.agent.sources.service import SourceService
from app.agent.sources.errors import SourceError
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest


class UserSourceTests(unittest.IsolatedAsyncioTestCase):
    def service(self, birth=date(1999, 1, 23), *, absent=False):
        row = dict(USER_NAME='테스트 대표', USER_EMAIL='test@example.com',
                   USER_BIRTH_DATE=birth, CREDIT_RATING='A')
        self.conn = FakeConnection([None if absent else row])

        @asynccontextmanager
        async def acquire():
            yield self.conn

        return SourceService(PostgresDataProvider(acquire))

    async def resolve(self, key=K.USER_BIRTH_DATE, **kwargs):
        return await self.service(**kwargs).resolve_source(
            SourceResolveContext(user_id=19), request(key, T.USER))

    async def test_birth_date_projection_and_identity(self):
        result = await self.resolve()
        self.assertEqual(result.value, date(1999, 1, 23))
        self.assertTrue(result.found)
        self.assertEqual(result.metadata['field_type'], 'DIRECT')
        self.assertEqual(USER_FIELDS[K.USER_BIRTH_DATE], 'birth_date')
        self.assertEqual(len(self.conn.calls), 1)
        sql, params = self.conn.calls[0]
        self.assertIn('birth_date AS "USER_BIRTH_DATE"', sql)
        self.assertIn('FROM users WHERE id = %s AND deleted_at IS NULL', sql)
        self.assertEqual(params, (19,))

    async def test_python_date_and_json_contract(self):
        result = await self.resolve()
        self.assertIs(type(result.value), date)
        self.assertEqual(result.model_dump(mode='json')['value'], '1999-01-23')

    async def test_null_birth_date(self):
        result = await self.resolve(birth=None)
        self.assertFalse(result.found)
        self.assertIsNone(result.value)

    async def test_user_absent(self):
        result = await self.resolve(absent=True)
        self.assertFalse(result.found)
        self.assertIsNone(result.value)
        self.assertEqual(result.metadata['code'], 'USER_NOT_FOUND')

    async def test_user_name(self):
        self.assertEqual((await self.resolve(K.USER_NAME)).value, '테스트 대표')

    async def test_user_email(self):
        self.assertEqual((await self.resolve(K.USER_EMAIL)).value, 'test@example.com')

    async def test_credit_rating(self):
        self.assertEqual((await self.resolve(K.CREDIT_RATING)).value, 'A')

    async def test_user_id_required(self):
        with self.assertRaises(SourceError) as caught:
            await self.service().resolve_source(SourceResolveContext(), request(K.USER_BIRTH_DATE, T.USER))
        self.assertEqual(caught.exception.code, 'MISSING_CONTEXT_ID')
        self.assertEqual(self.conn.calls, [])


class UserSourceRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_generic_direct_and_required_missing(self):
        provider = UserSourceTests()
        schema = field(key='birth_date', value_type='DATE',
                       sources=[source('USER_BIRTH_DATE', 'USER')])
        for stored in (date(1999, 1, 23), None):
            with self.subTest(stored=stored):
                runtime = DocumentAgentRuntime(
                    repository=SimpleNamespace(load=AsyncMock(return_value=template(schema))),
                    source_resolver=provider.service(birth=stored))
                result = await runtime.resolve(DocumentRuntimeRequest(template_id=1, user_id=19))
                self.assertEqual(result.ready_for_write, stored is not None)
                self.assertEqual(result.fields[0].runtime_status, 'RESOLVED' if stored else 'VALUE_MISSING')
                self.assertEqual(result.fields[0].value, stored)
