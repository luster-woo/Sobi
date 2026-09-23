import asyncio
import copy
import unittest
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import Mock, AsyncMock

from app.agent.documents.normalizer.models import NormalizationResult
from app.agent.documents.preprocessing import TemplatePreprocessingService, TemplatePreprocessingError
from app.agent.documents.preprocessing.repository import TemplateRepository


class Cursor:
    def __init__(self, row):
        self.row = row

    async def fetchone(self):
        return self.row


class TemplateDB:
    def __init__(self):
        self.document = {"id": 1, "type": "작성용"}
        self.template = None
        self.events = []
        self.active = False
        self.lock = asyncio.Lock()
        self.fail_status = False

    @asynccontextmanager
    async def acquire(self):
        async with self.lock:
            yield self

    @asynccontextmanager
    async def transaction(self):
        old = copy.deepcopy(self.template)
        self.active = True
        try:
            yield
        except BaseException:
            self.template = old
            raise
        finally:
            self.active = False

    async def execute(self, sql, params):
        assert self.active
        assert "document_field_" not in sql
        if "SELECT id, type" in sql:
            assert "FOR UPDATE" in sql
            return Cursor(self.document)
        if "SELECT id, parse_status" in sql:
            assert "schema_version = 1" in sql
            return Cursor(copy.deepcopy(self.template))
        if "INSERT INTO" in sql:
            self.template = dict(id=8, parse_status="PENDING", parse_error=None, schema_version=1)
            self.events.append("PENDING")
        elif "parse_status = 'PARSING'," in sql:
            self.template.update(parse_status="PARSING", parse_error=None)
            self.events.append("PARSING")
        elif "normalized_format =" in sql:
            self.template.update(normalized_format=params[0], normalized_path=params[1])
        elif "parse_status = 'COMPLETED'," in sql:
            self.template.update(parse_status="COMPLETED", parse_error=None)
            self.events.append("COMPLETED")
        elif "parse_status = 'FAILED'," in sql:
            if self.fail_status:
                raise RuntimeError("DB unavailable")
            self.template.update(parse_status="FAILED", parse_error=params[0])
            self.events.append("FAILED")
        else:
            raise AssertionError(sql)
        return Cursor({"id": 8})


class PreprocessingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = TemplateDB()
        self.repo = TemplateRepository(self.db.acquire)
        self.order = []
        self.parsed = object()
        self.candidates = [object(), object()]
        self.analysis = object()
        self.snapshot = "old"
        self.failure_stage = None
        self.error = RuntimeError("SECRET /server/private full document")
        self.normalized = NormalizationResult(original_path="input.hwpx", original_format="HWPX",
            normalized_path="copy.hwpx", normalized_format="HWPX", converted=False)

        def step(name, value):
            def run(*args):
                self.assertFalse(self.db.active, "DB transaction held during external work")
                self.assertEqual(self.db.template["parse_status"], "PARSING")
                self.assertIsNone(self.db.template["parse_error"])
                self.order.append(name)
                if self.failure_stage == name:
                    raise self.error
                return value
            return run

        self.normalizer = SimpleNamespace(normalize=Mock(side_effect=step("normalizer", self.normalized)))
        self.parser = SimpleNamespace(parse=Mock(side_effect=step("parser", self.parsed)))
        self.extractor = SimpleNamespace(extract=Mock(side_effect=step("extractor", self.candidates)))
        self.analyzer = SimpleNamespace(analyze=AsyncMock(side_effect=step("analyzer", self.analysis)))

        async def persist(template_id, analysis):
            step("persistence", None)()
            self.assertIs(analysis, self.analysis)
            self.snapshot = "new"
            return SimpleNamespace(field_count=2, source_count=1)

        self.persistence = SimpleNamespace(persist=AsyncMock(side_effect=persist))
        self.service = TemplatePreprocessingService(repository=self.repo, normalizer=self.normalizer,
            parser=self.parser, extractor=self.extractor, analyzer=self.analyzer, persistence=self.persistence)

    async def run_document(self, **kwargs):
        return await self.service.preprocess(1, "input.hwpx", "output", original_format=kwargs.get("original_format", "HWPX"))

    async def test_success_order_and_identity(self):
        saved = await self.run_document()
        self.assertEqual(self.db.events, ["PENDING", "PARSING", "COMPLETED"])
        self.assertEqual(self.order, ["normalizer", "parser", "extractor", "analyzer", "persistence"])
        self.assertEqual((saved.template_id, saved.field_count, saved.source_count), (8, 2, 1))
        self.extractor.extract.assert_called_once_with(self.parsed)
        self.assertIs(self.analyzer.analyze.call_args.args[0], self.candidates)
        self.assertEqual(self.db.template["normalized_path"], "copy.hwpx")

    async def test_document_missing(self):
        self.db.document = None
        with self.assertRaises(TemplatePreprocessingError) as caught:
            await self.run_document()
        self.assertEqual(caught.exception.code, "PROGRAM_DOCUMENT_NOT_FOUND")
        self.normalizer.normalize.assert_not_called()
        self.assertIsNone(self.db.template)

    async def test_not_writable(self):
        self.db.document["type"] = "제출용"
        with self.assertRaises(TemplatePreprocessingError) as caught:
            await self.run_document()
        self.assertEqual(caught.exception.code, "DOCUMENT_NOT_WRITABLE")
        self.normalizer.normalize.assert_not_called()

    async def assert_stage_failure(self, stage):
        self.failure_stage = stage
        with self.assertRaises(RuntimeError) as caught:
            await self.run_document()
        self.assertIs(caught.exception, self.error)
        self.assertEqual(self.db.template["parse_status"], "FAILED")
        self.assertNotIn("SECRET", self.db.template["parse_error"])
        self.assertNotIn("/server", self.db.template["parse_error"])
        expected = ["normalizer", "parser", "extractor", "analyzer", "persistence"]
        self.assertEqual(self.order, expected[:expected.index(stage) + 1])
        self.assertEqual(self.snapshot, "old")

    async def test_normalizer_failure(self):
        await self.assert_stage_failure("normalizer")

    async def test_parser_failure(self):
        await self.assert_stage_failure("parser")

    async def test_extractor_failure(self):
        await self.assert_stage_failure("extractor")

    async def test_analyzer_failure(self):
        await self.assert_stage_failure("analyzer")

    async def test_persistence_failure(self):
        await self.assert_stage_failure("persistence")

    async def test_retry_failed(self):
        await self.assert_stage_failure("analyzer")
        self.failure_stage = None
        await self.run_document()
        self.assertEqual(self.db.events[-2:], ["PARSING", "COMPLETED"])
        self.assertEqual(self.db.template["schema_version"], 1)

    async def test_retry_completed(self):
        first = await self.run_document()
        second = await self.run_document()
        self.assertEqual(first.template_id, second.template_id)
        self.assertEqual(self.db.events.count("PENDING"), 1)

    async def test_concurrent_start_rejected(self):
        entered, release = asyncio.Event(), asyncio.Event()

        async def analyze(candidates):
            entered.set()
            await release.wait()
            return self.analysis

        self.analyzer.analyze.side_effect = analyze
        task = asyncio.create_task(self.run_document())
        await entered.wait()
        try:
            with self.assertRaises(TemplatePreprocessingError) as caught:
                await self.run_document()
            self.assertEqual(caught.exception.code, "PREPROCESSING_IN_PROGRESS")
            self.assertEqual(self.db.template["parse_status"], "PARSING")
        finally:
            release.set()
            await task
        self.normalizer.normalize.assert_called_once()

    async def test_docx_parser_unsupported(self):
        self.normalizer.normalize.side_effect = lambda *args: NormalizationResult(
            original_path="a.docx", original_format="DOCX", normalized_path="b.docx", normalized_format="DOCX", converted=False)
        with self.assertRaises(TemplatePreprocessingError) as caught:
            await self.run_document(original_format="DOCX")
        self.assertEqual(caught.exception.code, "PARSER_FORMAT_UNSUPPORTED")
        self.parser.parse.assert_not_called()
        self.assertEqual(self.db.template["parse_status"], "FAILED")

    async def test_format_mismatch(self):
        with self.assertRaises(TemplatePreprocessingError) as caught:
            await self.run_document(original_format="HWP")
        self.assertEqual(caught.exception.code, "ORIGINAL_FORMAT_MISMATCH")
        self.parser.parse.assert_not_called()

    async def test_failed_status_write_preserves_original_exception(self):
        self.db.fail_status = True
        self.failure_stage = "analyzer"
        with self.assertRaises(RuntimeError) as caught:
            await self.run_document()
        self.assertIs(caught.exception, self.error)
        self.assertEqual(self.db.template["parse_status"], "PARSING")

    async def test_completed_write_failure(self):
        self.repo.completed = AsyncMock(side_effect=self.error)
        with self.assertRaises(RuntimeError) as caught:
            await self.run_document()
        self.assertIs(caught.exception, self.error)
        self.assertEqual(self.snapshot, "new")
        self.assertEqual(self.db.template["parse_status"], "FAILED")

    async def test_cancelled_analyzer(self):
        self.analyzer.analyze.side_effect = asyncio.CancelledError()
        with self.assertRaises(asyncio.CancelledError):
            await self.run_document()
        self.assertEqual(self.db.template["parse_status"], "FAILED")

    async def test_invalid_metadata(self):
        with self.assertRaises(TemplatePreprocessingError):
            await self.run_document(original_format="PDF")
        with self.assertRaises(TemplatePreprocessingError):
            await self.service.preprocess(True, "a", "b", original_format="HWP")
        self.normalizer.normalize.assert_not_called()
