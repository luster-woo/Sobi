"""Opt-in against a disposable DB with V19/V22/V23 applied; only TEMP tables are written."""
import os
import unittest
from contextlib import asynccontextmanager

from test_schema_persistence import direct, result
from test_schema_analyzer import source
from app.agent.documents.schema_persistence import DocumentSchemaPersistenceService, SchemaPersistenceError


@unittest.skipUnless(os.getenv("SCHEMA_PERSISTENCE_TEST_DSN"), "Dedicated PostgreSQL DSN not configured")
class PostgresPersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_jsonb_cascade_replace_and_real_rollback(self):
        from psycopg import AsyncConnection
        from psycopg.rows import dict_row

        async with await AsyncConnection.connect(os.environ["SCHEMA_PERSISTENCE_TEST_DSN"],
                                                autocommit=True, row_factory=dict_row) as conn:
            # Isolated parents; field/source definitions copied from migrated public tables.
            await conn.execute("CREATE TEMP TABLE program_document (id bigint PRIMARY KEY, type text NOT NULL)")
            await conn.execute("CREATE TEMP TABLE document_template (id bigint PRIMARY KEY, program_document_id bigint NOT NULL REFERENCES pg_temp.program_document(id))")
            await conn.execute("CREATE TEMP TABLE document_field_schema (LIKE public.document_field_schema INCLUDING ALL)")
            await conn.execute("CREATE TEMP TABLE document_field_source (LIKE public.document_field_source INCLUDING ALL)")
            # LIKE does not copy foreign keys. Add the actual V19 cascade contract locally.
            await conn.execute("ALTER TABLE pg_temp.document_field_schema ADD FOREIGN KEY (template_id) REFERENCES pg_temp.document_template(id) ON DELETE CASCADE")
            await conn.execute("ALTER TABLE pg_temp.document_field_source ADD FOREIGN KEY (field_schema_id) REFERENCES pg_temp.document_field_schema(id) ON DELETE CASCADE")
            await conn.execute("INSERT INTO pg_temp.program_document VALUES (1, '작성용')")
            await conn.execute("INSERT INTO pg_temp.document_template VALUES (1, 1)")

            @asynccontextmanager
            async def acquire():
                yield conn

            service = DocumentSchemaPersistenceService(acquire)
            data = result(direct())
            data.fields[0].candidate.target_location.native_ref = {"element_path": [1, 2], "nested": {"x": None}}
            data.fields[0].candidate.current_text = "원"
            data.fields[0].candidate.hints = {"insertion_mode": "BEFORE_SUFFIX", "unit": "원"}
            await service.persist(1, data)
            saved = await (await conn.execute("SELECT * FROM pg_temp.document_field_schema")).fetchall()
            self.assertEqual(saved[0]["mapping_status"], "RESOLVED")
            self.assertEqual(saved[0]["location_info"]["target_location"], data.fields[0].candidate.target_location.model_dump(mode="json"))
            self.assertEqual(saved[0]["location_info"]["hints"], data.fields[0].candidate.hints)
            self.assertIsNone(saved[0]["constraints"])
            before_sources = await (await conn.execute("SELECT * FROM pg_temp.document_field_source")).fetchall()
            # PostgreSQL JSONB rejects U+0000; failure occurs after deletion/new field insertion.
            bad = result(direct("bad", status="NEEDS_REVIEW", sources=[source(source_params={"bad": "\u0000"})]))
            with self.assertRaises(SchemaPersistenceError):
                await service.persist(1, bad)
            self.assertEqual(await (await conn.execute("SELECT * FROM pg_temp.document_field_schema")).fetchall(), saved)
            self.assertEqual(await (await conn.execute("SELECT * FROM pg_temp.document_field_source")).fetchall(), before_sources)
            await service.persist(1, result(direct("replacement", status="UNSUPPORTED")))
            replaced = await (await conn.execute("SELECT * FROM pg_temp.document_field_schema")).fetchall()
            self.assertEqual(len(replaced), 1)
            self.assertEqual(replaced[0]["mapping_status"], "UNSUPPORTED")
            remaining = await (await conn.execute("SELECT * FROM pg_temp.document_field_source")).fetchall()
            self.assertEqual(len(remaining), 1)
            self.assertNotEqual(remaining[0]["field_schema_id"], saved[0]["id"])
            await service.persist(1, result(direct("review", status="NEEDS_REVIEW", sources=[])))
            reviewed = await (await conn.execute("SELECT mapping_status FROM pg_temp.document_field_schema")).fetchone()
            self.assertEqual(reviewed["mapping_status"], "NEEDS_REVIEW")
            await service.persist(1, result())
            self.assertEqual(await (await conn.execute("SELECT * FROM pg_temp.document_field_source")).fetchall(), [])
