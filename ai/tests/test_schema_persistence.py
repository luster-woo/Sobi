import copy
import json
import unittest
from contextlib import asynccontextmanager

from test_schema_analyzer import candidate, field, source
from app.agent.documents.candidates.enums import FieldInputShape
from app.agent.documents.schema_analyzer.models import SchemaAnalysisResult
from app.agent.documents.schema_persistence import (
    DocumentSchemaPersistenceService, SchemaPersistenceError, StoredLocationInfo,
)


def result(*items):
    return SchemaAnalysisResult.model_validate({"fields": [
        {"candidate": candidate(cid=item["candidate_id"]), "analysis": item,
         "runtime_supported": False} for item in items]})


def direct(key="business_name", cid="c1", **kwargs):
    return field(key=key, cid=cid, field_label="업체명", **kwargs)


class Cursor:
    def __init__(self, row):
        self.row = row

    async def fetchone(self):
        return self.row


class FakeDB:
    def __init__(self):
        self.templates = {1: "작성용", 2: "제출용", 3: "작성용"}
        self.fields = []
        self.sources = []
        self.sequence = 0
        self.failure = None
        self.calls = []
        self.in_transaction = False
        self.rollbacks = 0

    @asynccontextmanager
    async def acquire(self):
        yield self

    @asynccontextmanager
    async def transaction(self):
        old = copy.deepcopy((self.fields, self.sources))
        self.in_transaction = True
        try:
            yield
            if self.failure == "commit":
                raise RuntimeError("private connection data")
        except BaseException:
            self.fields, self.sources = old
            self.rollbacks += 1
            raise
        finally:
            self.in_transaction = False

    async def execute(self, sql, params):
        assert self.in_transaction
        self.calls.append((sql, params))
        if "SELECT dt.id" in sql:
            assert "FOR UPDATE OF dt, pd" in sql
            return Cursor({"id": params[0], "document_type": self.templates[params[0]]}
                          if params[0] in self.templates else None)
        if sql.startswith("DELETE"):
            removed = {f["id"] for f in self.fields if f["template_id"] == params[0]}
            self.fields = [f for f in self.fields if f["id"] not in removed]
            self.sources = [s for s in self.sources if s["field_schema_id"] not in removed]
        elif "INSERT INTO document_field_schema" in sql:
            if params[1] == self.failure:
                raise RuntimeError("private SQL data")
            self.sequence += 1
            saved = dict(zip(("template_id", "field_key", "field_label", "field_order", "field_type",
                              "value_type", "mapping_status", "required", "instruction", "location_info"), params))
            saved["id"] = self.sequence
            saved["location_info"] = json.loads(saved["location_info"])
            self.fields.append(saved)
            return Cursor({"id": self.sequence})
        elif "INSERT INTO document_field_source" in sql:
            if self.failure == "source":
                raise RuntimeError("private source data")
            saved = dict(zip(("field_schema_id", "source_type", "source_key", "required", "priority",
                              "query_hint", "source_params"), params))
            saved["source_params"] = json.loads(saved["source_params"])
            self.sources.append(saved)
        else:
            raise AssertionError(sql)
        return Cursor(None)


class PersistenceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = FakeDB()
        self.service = DocumentSchemaPersistenceService(self.db.acquire)

    async def test_direct(self):
        saved = await self.service.persist(1, result(direct()))
        self.assertEqual((saved.field_count, saved.source_count, saved.ignored_count), (1, 1, 0))
        self.assertEqual(self.db.fields[0]["field_type"], "DIRECT")
        self.assertEqual(self.db.fields[0]["mapping_status"], "RESOLVED")
        self.assertIs(type(self.db.fields[0]["mapping_status"]), str)
        self.assertEqual(self.db.fields[0]["field_label"], "업체명")
        self.assertEqual(self.db.sources[0]["field_schema_id"], self.db.fields[0]["id"])

    async def empty_sources(self, semantic, status):
        await self.service.persist(1, result(direct(semantic=semantic, status=status, sources=[])))
        self.assertEqual(self.db.fields[0]["field_type"], semantic)
        self.assertEqual(self.db.fields[0]["mapping_status"], status)
        self.assertEqual(self.db.sources, [])

    async def test_user_input(self):
        await self.empty_sources("USER_INPUT", "UNSUPPORTED")

    async def test_user_input_resolved(self):
        await self.empty_sources("USER_INPUT", "RESOLVED")

    async def test_runtime_supported_not_persisted(self):
        data = result(direct())
        data.fields[0].runtime_supported = True
        await self.service.persist(1, data)
        self.assertNotIn("runtime_supported", json.dumps(self.db.fields))
        self.assertNotIn("runtime_supported", json.dumps(self.db.sources))
        self.assertTrue(all("runtime_supported" not in sql for sql, _ in self.db.calls))

    async def test_replace_mapping_status_snapshot(self):
        await self.service.persist(1, result(direct()))
        old_id = self.db.fields[0]["id"]
        for status in ("NEEDS_REVIEW", "UNSUPPORTED", "RESOLVED"):
            await self.service.persist(1, result(direct(status=status)))
            self.assertEqual(len(self.db.fields), 1)
            self.assertEqual(self.db.fields[0]["mapping_status"], status)
            self.assertNotEqual(self.db.fields[0]["id"], old_id)
            self.assertEqual(self.db.sources[0]["field_schema_id"], self.db.fields[0]["id"])

    async def test_unsupported(self):
        await self.empty_sources("DIRECT", "UNSUPPORTED")

    async def test_needs_review(self):
        await self.empty_sources("DIRECT", "NEEDS_REVIEW")

    async def test_computed(self):
        await self.empty_sources("COMPUTED", "UNSUPPORTED")

    async def test_generated(self):
        await self.empty_sources("GENERATED", "NEEDS_REVIEW")

    async def test_ignore(self):
        saved = await self.service.persist(1, result(direct(semantic="IGNORE", key=None, sources=[], status="UNSUPPORTED")))
        self.assertEqual((saved.field_count, saved.ignored_count), (0, 1))

    async def test_multiple_sources_and_json(self):
        params = {"nested": [None, True, 3, {"한글": "원"}]}
        await self.service.persist(1, result(direct(sources=[source(priority=1), source(priority=2, source_params=params)])))
        self.assertEqual([s["priority"] for s in self.db.sources], [1, 2])
        self.assertEqual(len({s["field_schema_id"] for s in self.db.sources}), 1)
        self.assertEqual(self.db.sources[1]["source_params"], params)

    async def test_order_without_candidate_sort(self):
        await self.service.persist(1, result(direct("first", "c10"), direct(semantic="IGNORE", key=None, sources=[], status="UNSUPPORTED"), direct("last", "c2")))
        self.assertEqual([(f["field_key"], f["field_order"]) for f in self.db.fields], [("first", 0), ("last", 1)])

    async def test_location_and_suffix_roundtrip(self):
        data = result(direct())
        target = data.fields[0].candidate
        target.target_location.native_ref = {"element_path": [0, 4, 2], "nested": {"a": [None, "한글"]}}
        target.current_text = "원"
        target.input_shape = FieldInputShape.NUMBER
        target.hints = {"target_kind": "unit_suffix", "insertion_mode": "BEFORE_SUFFIX", "unit": "원"}
        original = copy.deepcopy(data.model_dump(mode="json"))
        await self.service.persist(1, data)
        restored = StoredLocationInfo.model_validate(self.db.fields[0]["location_info"])
        self.assertEqual(restored.target_location, target.target_location)
        self.assertNotEqual(restored.target_location, target.label_location)
        self.assertEqual((restored.current_text, restored.input_shape, restored.hints), ("원", "NUMBER", target.hints))
        self.assertEqual(data.model_dump(mode="json"), original)
        self.assertNotIn("mapping_status", self.db.fields[0]["location_info"])

    async def test_replace_all_and_other_template(self):
        await self.service.persist(3, result(direct("other")))
        await self.service.persist(1, result(direct("a"), direct("b"), direct("c")))
        old_ids = {f["id"] for f in self.db.fields if f["template_id"] == 1}
        await self.service.persist(1, result(direct("d"), direct("e")))
        self.assertEqual([f["field_key"] for f in self.db.fields], ["other", "d", "e"])
        self.assertFalse(old_ids.intersection(s["field_schema_id"] for s in self.db.sources))

    async def test_empty_snapshot_clears(self):
        await self.service.persist(1, result(direct()))
        await self.service.persist(1, result())
        self.assertEqual((self.db.fields, self.db.sources), ([], []))

    async def test_rollback_field_source_and_commit_failures(self):
        await self.service.persist(1, result(direct("old")))
        old = copy.deepcopy((self.db.fields, self.db.sources))
        for failure in ("second", "source", "commit"):
            with self.subTest(failure=failure):
                self.db.failure = failure
                with self.assertRaises(SchemaPersistenceError) as caught:
                    await self.service.persist(1, result(direct("first", status="NEEDS_REVIEW"), direct("second", status="UNSUPPORTED")))
                self.assertEqual(caught.exception.code, "SCHEMA_PERSISTENCE_FAILED")
                self.assertNotIn("private", str(caught.exception))
                self.assertEqual((self.db.fields, self.db.sources), old)

    async def test_missing_template(self):
        with self.assertRaises(SchemaPersistenceError) as caught:
            await self.service.persist(999, result(direct()))
        self.assertEqual(caught.exception.code, "DOCUMENT_TEMPLATE_NOT_FOUND")

    async def test_submission_document_rejected(self):
        with self.assertRaises(SchemaPersistenceError) as caught:
            await self.service.persist(2, result(direct()))
        self.assertEqual(caught.exception.code, "DOCUMENT_NOT_WRITABLE")

    async def assert_invalid(self, data):
        with self.assertRaises(SchemaPersistenceError) as caught:
            await self.service.persist(1, data)
        self.assertEqual(caught.exception.code, "INVALID_SCHEMA_INPUT")
        self.assertEqual(self.db.calls, [])

    async def test_missing_key(self):
        data = result(direct())
        data.fields[0].analysis.field_key = None
        await self.assert_invalid(data)

    async def test_missing_target(self):
        data = result(direct())
        data.fields[0].candidate.target_location = None
        await self.assert_invalid(data)

    async def test_duplicate_key(self):
        await self.assert_invalid(result(direct(), direct()))

    async def test_db_lengths_and_nullable_label(self):
        for attr, value in (("field_key", "a" * 101), ("field_label", "가" * 256), ("field_label", None)):
            data = result(direct())
            setattr(data.fields[0].analysis, attr, value)
            await self.assert_invalid(data)

    async def test_candidate_mismatch(self):
        data = result(direct())
        data.fields[0].analysis.candidate_id = "wrong"
        await self.assert_invalid(data)

    async def test_invalid_template_id(self):
        for value in (True, 0, -1, "1", 2**63):
            with self.assertRaises(SchemaPersistenceError):
                await self.service.persist(value, result(direct()))
        self.assertEqual(self.db.calls, [])
