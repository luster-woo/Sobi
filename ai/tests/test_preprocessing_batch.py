import asyncio
import tempfile
import unittest
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.agent.documents.preprocessing_batch import BatchError, BatchOptions, BatchPreprocessingService, InMemoryBatchStore
from app.agent.documents.preprocessing_batch.config import BatchSettings
from app.agent.documents.preprocessing_batch.files import resolve_source
from app.agent.documents.preprocessing_batch.repository import BatchDocumentRepository


def document(id=1, state=None):
    return {"program_document_id": id, "template_id": id + 100 if state else None, "parse_status": state}


class BatchTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.original = self.root / "original"
        self.original.mkdir()
        self.settings = BatchSettings(self.original, self.root / "normalized")
        self.repository = SimpleNamespace(list_documents=AsyncMock(return_value=[document()]))
        self.preprocessor = SimpleNamespace(preprocess=AsyncMock(return_value=SimpleNamespace(template_id=101)))
        self.service = BatchPreprocessingService(settings=self.settings, repository=self.repository, preprocessor=self.preprocessor)

    def file(self, id=1, name="application.hwp"):
        folder = self.original / str(id)
        folder.mkdir(exist_ok=True)
        path = folder / name
        path.write_bytes(b"original")
        return path

    async def batch(self, **options):
        state = self.service.start()
        return await self.service.run(state.batch_id, BatchOptions(**options))

    async def test_hwp_path_and_original_protection(self):
        source = self.file(name="application.HwP")
        saved = await self.batch()
        args = self.preprocessor.preprocess.call_args
        self.assertEqual(args.args, (1, source, self.settings.normalized_root / "1"))
        self.assertEqual(args.kwargs["original_format"], "HWP")
        self.assertEqual(source.read_bytes(), b"original")
        self.assertEqual((saved.total, saved.processed, saved.completed), (1, 1, 1))
        self.assertNotIn(str(source), saved.model_dump_json())

    async def test_hwpx(self):
        self.file(name="application.HWPX")
        await self.batch()
        self.assertEqual(self.preprocessor.preprocess.call_args.kwargs["original_format"], "HWPX")

    async def assert_failure(self, code):
        state = await self.batch()
        self.assertEqual(state.status, "COMPLETED")
        self.assertEqual((state.failed, state.processed), (1, 1))
        self.assertEqual(state.items[0].error_code, code)
        self.preprocessor.preprocess.assert_not_called()

    async def test_missing_directory(self):
        await self.assert_failure("SOURCE_DIRECTORY_NOT_FOUND")

    async def test_no_source(self):
        self.file(name="notes.txt")
        await self.assert_failure("SOURCE_FILE_NOT_FOUND")

    async def test_multiple(self):
        self.file()
        self.file(name="second.hwpx")
        await self.assert_failure("MULTIPLE_SOURCE_FILES")

    async def test_mixed_source_candidates(self):
        self.file()
        self.file(name="second.doc")
        await self.assert_failure("MULTIPLE_SOURCE_FILES")

    async def test_doc_unsupported(self):
        self.file(name="application.doc")
        await self.assert_failure("PARSER_FORMAT_UNSUPPORTED")

    async def test_docx_unsupported(self):
        self.file(name="application.docx")
        await self.assert_failure("PARSER_FORMAT_UNSUPPORTED")

    async def test_hidden_temporary_files_ignored(self):
        self.file()
        self.file(name=".hidden.hwp")
        self.file(name="~$temp.hwpx")
        self.file(name="copy.hwp~")
        self.assertEqual((await self.batch()).completed, 1)

    async def policy(self, state, expected, **options):
        self.repository.list_documents.return_value = [document(state=state)]
        self.file()
        saved = await self.batch(**options)
        self.assertEqual(saved.items[0].status, expected)
        self.assertEqual(self.preprocessor.preprocess.await_count, int(expected == "COMPLETED"))

    async def test_completed_skip(self):
        await self.policy("COMPLETED", "SKIPPED")

    async def test_completed_reprocess(self):
        await self.policy("COMPLETED", "COMPLETED", reprocess_completed=True)

    async def test_failed_retry(self):
        await self.policy("FAILED", "COMPLETED")

    async def test_failed_skip(self):
        await self.policy("FAILED", "SKIPPED", retry_failed=False)

    async def test_parsing_skip(self):
        await self.policy("PARSING", "SKIPPED", reprocess_completed=True)

    async def test_pending_process(self):
        await self.policy("PENDING", "COMPLETED")

    async def test_continue_after_failure_and_counts(self):
        self.repository.list_documents.return_value = [document(1), document(2), document(3), document(4, "COMPLETED")]
        for id in (1, 2, 3):
            self.file(id)
        self.preprocessor.preprocess.side_effect = [SimpleNamespace(template_id=101), RuntimeError("SECRET /private/file"), SimpleNamespace(template_id=103)]
        state = await self.batch()
        self.assertEqual([c.args[0] for c in self.preprocessor.preprocess.call_args_list], [1, 2, 3])
        self.assertEqual((state.total, state.processed, state.completed, state.failed, state.skipped), (4, 4, 2, 1, 1))
        self.assertEqual(state.processed, state.completed + state.failed + state.skipped)
        self.assertEqual(state.status, "COMPLETED")
        self.assertNotIn("SECRET", state.model_dump_json())

    async def test_running_progress_and_second_start(self):
        self.file()
        entered, release = asyncio.Event(), asyncio.Event()
        async def preprocess(*args, **kwargs):
            entered.set()
            await release.wait()
            return SimpleNamespace(template_id=101)
        self.preprocessor.preprocess.side_effect = preprocess
        initial = self.service.start()
        task = asyncio.create_task(self.service.run(initial.batch_id, BatchOptions()))
        await entered.wait()
        try:
            state = self.service.get(initial.batch_id)
            self.assertEqual((state.status, state.total, state.processed), ("RUNNING", 1, 0))
            with self.assertRaises(BatchError) as caught:
                self.service.start()
            self.assertEqual(caught.exception.code, "BATCH_ALREADY_RUNNING")
        finally:
            release.set()
            await task
        self.assertEqual(self.service.get(initial.batch_id).status, "COMPLETED")
        self.assertIsNotNone(self.service.get(initial.batch_id).finished_at)

    async def test_infrastructure_failure_release(self):
        self.repository.list_documents.side_effect = RuntimeError("password")
        state = await self.batch()
        self.assertEqual(state.status, "FAILED")
        self.assertEqual(state.error_code, "BATCH_EXECUTION_FAILED")
        self.assertEqual(self.service.start().status, "RUNNING")

    async def test_cancel_release(self):
        self.repository.list_documents.side_effect = asyncio.CancelledError()
        state = self.service.start()
        with self.assertRaises(asyncio.CancelledError):
            await self.service.run(state.batch_id, BatchOptions())
        self.assertEqual(self.service.get(state.batch_id).status, "FAILED")
        self.service.start()

    async def test_missing_batch(self):
        with self.assertRaises(BatchError) as caught:
            self.service.get("missing")
        self.assertEqual(caught.exception.code, "BATCH_NOT_FOUND")

    async def test_db_source_of_truth(self):
        self.file(999)
        self.repository.list_documents.return_value = []
        state = await self.batch()
        self.assertEqual((state.total, state.processed), (0, 0))
        self.preprocessor.preprocess.assert_not_called()

    async def test_id_only(self):
        with self.assertRaises(BatchError):
            resolve_source(self.settings, "../outside")
        with self.assertRaises(BatchError):
            resolve_source(self.settings, True)

    async def test_root_overlap(self):
        for target in (self.original, self.original / "out", self.root):
            with self.assertRaises(BatchError):
                BatchSettings(self.original, target).validate()

    async def test_output_escape(self):
        self.file()
        target = self.settings.normalized_root / "1"
        original = Path.is_symlink
        with patch.object(Path, "is_symlink", lambda path: path == target or original(path)):
            await self.assert_failure("UNSAFE_OUTPUT_PATH")

    async def test_source_directory_link_rejected(self):
        self.file()
        directory = self.original / "1"
        original = Path.is_symlink
        with patch.object(Path, "is_symlink", lambda path: path == directory or original(path)):
            await self.assert_failure("UNSAFE_SOURCE_PATH")

    async def test_source_file_link_rejected(self):
        source = self.file()
        original = Path.is_symlink
        with patch.object(Path, "is_symlink", lambda path: path == source or original(path)):
            await self.assert_failure("UNSAFE_SOURCE_PATH")

    async def test_history_and_copy_isolation(self):
        store = InMemoryBatchStore(max_history=1)
        state = store.create()
        clone = store.get(state.batch_id)
        clone.status = "FAILED"
        self.assertEqual(store.get(state.batch_id).status, "RUNNING")
        store.finish(state.batch_id)
        store.release(state.batch_id)
        store.create()
        with self.assertRaises(BatchError):
            store.get(state.batch_id)

    async def test_same_batch_not_run_twice(self):
        self.repository.list_documents.return_value = []
        state = await self.batch()
        with self.assertRaises(BatchError):
            await self.service.run(state.batch_id, BatchOptions())

    async def test_repository_writable_filter_and_version(self):
        captured = []
        class Connection:
            async def execute(self, sql):
                captured.append(sql)
                return SimpleNamespace(fetchall=AsyncMock(return_value=[document()]))
        @asynccontextmanager
        async def acquire():
            yield Connection()
        rows = await BatchDocumentRepository(acquire).list_documents()
        self.assertEqual(rows, [document()])
        self.assertIn("WHERE pd.type = '작성용'", captured[0])
        self.assertIn("ORDER BY pd.id", captured[0])
        self.assertIn("dt.schema_version = 1", captured[0])
