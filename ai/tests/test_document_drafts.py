import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, date
from pathlib import Path
import tempfile
from threading import get_ident
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4
from app.agent.documents.schema_analyzer.enums import FieldValueType

from test_document_runtime import template
import test_document_writer as fixtures
from app.agent.documents.drafts import DraftGenerationService, DraftRequest, DraftResponse, InMemoryDraftStore
from app.agent.documents.drafts.errors import DraftError
from app.agent.documents.drafts.models import DraftRecord
from app.agent.documents.drafts.service import TemplateSnapshot, build_runtime
from app.agent.documents.drafts.settings import DraftSettings
from app.agent.documents.runtime import DocumentRuntimeError
from app.agent.documents.writer import DocumentWriteError


class DraftServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.fx = fixtures.WriterTests()
        self.fx.setUp()
        self.addCleanup(self.fx.doCleanups)
        self.loaded = template()
        self.loaded.normalized_path = str(self.fx.source)
        self.repo = SimpleNamespace(load=AsyncMock(return_value=self.loaded))
        self.result = self.fx.runtime(self.fx.resolved())
        self.runtime = SimpleNamespace(resolve=AsyncMock(return_value=self.result))
        self.factory = Mock(return_value=self.runtime)
        self.writer = SimpleNamespace(write=Mock(side_effect=self.write))
        self.service = DraftGenerationService(settings=DraftSettings(self.fx.root/'generated'),
            repository=self.repo, runtime_factory=self.factory, writer=self.writer)
        self.request = DraftRequest(templateId=1, userId=9)

    def write(self, *, source_path, runtime_result, output_path):
        self.assertEqual(source_path, self.fx.source)
        self.assertIs(runtime_result, self.result)
        with self.assertRaises(DraftError):
            self.service.store.get(__import__('uuid').UUID(output_path.stem.removeprefix('draft-')))
        output_path.write_bytes(b'fake writer output')
        self.writer_thread = get_ident()
        return SimpleNamespace(written_count=14)

    async def assert_failure(self, code, *, before_runtime=False):
        with self.assertRaises(DraftError) as caught:
            await self.service.generate(self.request)
        self.assertEqual(caught.exception.code, code)
        self.assertEqual(self.service.store._records, {})
        if before_runtime:
            self.factory.assert_not_called()
            self.writer.write.assert_not_called()
        return caught.exception

    async def test_success_metadata_and_order(self):
        response = await self.service.generate(self.request)
        self.assertEqual(response.draft_id.version, 4)
        self.assertEqual(response.template_id, 1)
        self.assertEqual(response.program_document_id, 2)
        self.assertEqual(response.written_field_count, 14)
        self.assertEqual(response.file_name, f'draft-{response.draft_id}.hwpx')
        record = self.service.store.get(response.draft_id)
        self.assertEqual(record.generated_file_path.parent, self.fx.root/'generated')
        self.assertIsNotNone(record.created_at.tzinfo)
        self.assertNotIn(str(self.fx.root), response.model_dump_json())
        self.assertNotIn('성현상사', response.model_dump_json())
        self.repo.load.assert_awaited_once_with(1)
        self.assertEqual(self.runtime.resolve.call_args.args[0].user_id, 9)
        snapshot = self.factory.call_args.args[0]
        self.assertEqual(await snapshot.load(1), self.loaded)

    async def test_left_blank_and_optional_unsupported_are_success(self):
        self.result.fields += [self.fx.resolved(runtime_status='LEFT_BLANK', field_type='USER_INPUT', value=None)] * 4
        self.result.fields += [self.fx.resolved(runtime_status='UNSUPPORTED', required=False, value=None)] * 2
        response = await self.service.generate(self.request)
        self.assertEqual((response.left_blank_field_count, response.unsupported_field_count), (4, 2))

    async def test_birth_date_and_inline_pass_through(self):
        self.result.fields[0].value_type = FieldValueType.DATE
        self.result.fields[0].value = date(1999,1,23)
        self.result.fields[0].source_key = 'USER_BIRTH_DATE'
        inline = self.fx.resolved()
        inline.location_info['target_location']['type'] = 'PARAGRAPH_INLINE'
        inline.location_info['hints']['target_kind'] = 'inline_blank'
        self.result.fields.append(inline)
        before = self.result.model_dump()
        await self.service.generate(self.request)
        self.assertEqual(self.result.model_dump(), before)

    async def test_not_ready_filters_blockers(self):
        self.result.ready_for_write = False
        self.result.fields = [self.fx.resolved(runtime_status='VALUE_MISSING', value=None, field_key='user_email', field_label='E-mail'),
            self.fx.resolved(runtime_status='LEFT_BLANK', field_type='USER_INPUT', value=None),
            self.fx.resolved(runtime_status='UNSUPPORTED', required=False, value=None)]
        error = await self.assert_failure('DRAFT_NOT_READY')
        self.assertEqual(error.status, 409)
        self.assertEqual(error.details, [{'fieldKey':'user_email','fieldLabel':'E-mail','status':'VALUE_MISSING'}])
        self.writer.write.assert_not_called()
        self.assertFalse((self.fx.root/'generated').exists())

    async def test_unknown_template(self):
        self.repo.load.side_effect = DocumentRuntimeError('TEMPLATE_NOT_FOUND')
        self.assertEqual((await self.assert_failure('TEMPLATE_NOT_FOUND', before_runtime=True)).status, 404)

    async def test_failed_parsing_and_pending_templates(self):
        for status in ('FAILED','PARSING','PENDING'):
            self.loaded.parse_status = status
            await self.assert_failure('TEMPLATE_NOT_READY', before_runtime=True)

    async def test_repository_not_completed_error_translation(self):
        self.repo.load.side_effect = DocumentRuntimeError('TEMPLATE_NOT_COMPLETED')
        await self.assert_failure('TEMPLATE_NOT_READY', before_runtime=True)

    async def test_not_writable(self):
        self.loaded.document_type = '제출용'
        await self.assert_failure('DOCUMENT_NOT_WRITABLE', before_runtime=True)

    async def test_missing_normalized_path(self):
        self.loaded.normalized_path = None
        await self.assert_failure('NORMALIZED_FILE_NOT_FOUND', before_runtime=True)

    async def test_missing_file(self):
        self.loaded.normalized_path = str(self.fx.root/'missing.hwpx')
        await self.assert_failure('NORMALIZED_FILE_NOT_FOUND', before_runtime=True)

    async def test_directory_input(self):
        self.loaded.normalized_path = str(self.fx.root)
        await self.assert_failure('NORMALIZED_FILE_NOT_FOUND', before_runtime=True)

    async def test_unsupported_normalized_format(self):
        self.loaded.normalized_format = 'DOCX'
        await self.assert_failure('UNSUPPORTED_SOURCE_FORMAT', before_runtime=True)

    async def test_wrong_template_id(self):
        self.loaded.template_id = 2
        await self.assert_failure('TEMPLATE_ID_MISMATCH', before_runtime=True)

    async def test_writer_failure_no_registration(self):
        self.writer.write.side_effect = DocumentWriteError('TARGET_CONTENT_MISMATCH')
        await self.assert_failure('TARGET_CONTENT_MISMATCH')
        self.assertEqual(list((self.fx.root/'generated').iterdir()), [])

    async def test_writer_success_without_output(self):
        self.writer.write.side_effect = None
        self.writer.write.return_value = SimpleNamespace(written_count=1)
        await self.assert_failure('DRAFT_FILE_NOT_FOUND')

    async def test_empty_output_not_registered(self):
        def empty(**kwargs):
            kwargs['output_path'].touch()
            return SimpleNamespace(written_count=1)
        self.writer.write.side_effect = empty
        await self.assert_failure('DRAFT_OUTPUT_INVALID')

    async def test_unexpected_failure_redacted(self):
        self.runtime.resolve.side_effect = RuntimeError('/secret/file.hwpx name@email.test')
        with self.assertLogs('app.agent.documents.drafts.service') as logs:
            error = await self.assert_failure('DRAFT_GENERATION_FAILED')
        self.assertNotIn('name@email.test', str(error.as_dict()) + str(logs.output))
        self.assertNotIn('/secret', str(error.as_dict()) + str(logs.output))

    async def test_writer_runs_off_event_loop(self):
        loop_thread = get_ident()
        await self.service.generate(self.request)
        self.assertNotEqual(self.writer_thread, loop_thread)

    async def test_concurrent_requests_unique(self):
        responses = await asyncio.gather(*(self.service.generate(self.request) for _ in range(6)))
        self.assertEqual(len({r.draft_id for r in responses}), 6)
        self.assertEqual(len(self.service.store._records), 6)

    async def test_default_runtime_factory_reuses_snapshot_and_generation(self):
        with patch('app.agent.documents.drafts.service.DocumentAgentRuntime') as runtime:
            repository = TemplateSnapshot(self.loaded)
            build_runtime(repository)
            runtime.assert_called_once_with(repository=repository)  # No disabled generation client.

    async def test_snapshot_copy_isolation(self):
        snapshot = TemplateSnapshot(self.loaded)
        self.loaded.normalized_path = 'changed'
        copy = await snapshot.load(1)
        self.assertEqual(copy.normalized_path, str(self.fx.source))
        copy.normalized_path = 'changed again'
        self.assertEqual((await snapshot.load(1)).normalized_path, str(self.fx.source))
        with self.assertRaises(DocumentRuntimeError):
            await snapshot.load(99)

    async def test_output_collision_never_overwrites(self):
        self.service.writer = self.fx.writer  # Actual atomic Writer contract.
        root=self.fx.root/'generated'; root.mkdir()
        collision=uuid4(); existing=root/f'draft-{collision}.hwpx'
        existing.write_bytes(b'original output')
        with patch('app.agent.documents.drafts.service.uuid4',return_value=collision):
            await self.assert_failure('OUTPUT_ALREADY_EXISTS')
        self.assertEqual(existing.read_bytes(),b'original output')

    async def test_existing_repository_snapshot_loaded_only_once(self):
        import test_document_runtime as runtime_fixtures
        fake_db=runtime_fixtures.RepositoryTests(); fake_db.setUp()
        fake_db.data['normalized_path']=str(self.fx.source)
        self.service.repository=fake_db.repository
        await self.service.generate(self.request)
        self.assertEqual(len(fake_db.queries),4)  # One read transaction, no duplicate Draft SQL.
        self.assertEqual(fake_db.queries[1][1],(1,))
        self.assertIn('JOIN program_document',fake_db.queries[1][0])

    async def test_missing_joined_program_document(self):
        import test_document_runtime as runtime_fixtures
        fake_db=runtime_fixtures.RepositoryTests(); fake_db.setUp(); fake_db.data=None
        self.service.repository=fake_db.repository
        await self.assert_failure('TEMPLATE_NOT_FOUND',before_runtime=True)

    async def test_all_required_automatic_blocking_statuses(self):
        for status in ('VALUE_MISSING','UNSUPPORTED','NEEDS_REVIEW','ERROR','NOT_IMPLEMENTED','INPUT_REQUIRED'):
            self.result.ready_for_write=False
            self.result.fields=[self.fx.resolved(runtime_status=status,value=None)]
            error=await self.assert_failure('DRAFT_NOT_READY')
            self.assertEqual(error.details[0]['status'],status)
        self.writer.write.assert_not_called()


def record(root, draft_id=None):
    draft_id = draft_id or uuid4()
    name = f'draft-{draft_id}.hwpx'
    return DraftRecord(DraftResponse(draft_id=draft_id, template_id=1, program_document_id=2,
        file_name=name, written_field_count=1, left_blank_field_count=0, unsupported_field_count=0),
        root/name, datetime.now(timezone.utc))


class DraftStoreSettingsTests(unittest.TestCase):
    def test_put_get(self):
        store = InMemoryDraftStore(); item = record(Path('/generated'))
        store.put(item)
        self.assertIs(store.get(item.response.draft_id), item)

    def test_unknown(self):
        with self.assertRaises(DraftError) as caught:
            InMemoryDraftStore().get(uuid4())
        self.assertEqual(caught.exception.code, 'DRAFT_NOT_FOUND')

    def test_no_overwrite(self):
        store = InMemoryDraftStore(); item = record(Path('/generated'))
        store.put(item)
        with self.assertRaises(DraftError): store.put(item)
        self.assertIs(store.get(item.response.draft_id), item)

    def test_concurrent_store_access(self):
        store = InMemoryDraftStore(); items = [record(Path('/generated')) for _ in range(30)]
        def put_get(item):
            store.put(item)
            return store.get(item.response.draft_id)
        with ThreadPoolExecutor(max_workers=6) as pool:
            self.assertEqual(list(pool.map(put_get,items)), items)

    def test_relative_root_rejected(self):
        with self.assertRaises(DraftError): DraftSettings(Path('relative')).root(create=True)

    def test_env_configuration(self):
        import sys
        with patch.dict(sys.modules, {'app.core.config': SimpleNamespace()}), patch.dict('os.environ', {'DOCUMENT_AGENT_GENERATED_ROOT':''}):
            with self.assertRaises(DraftError) as caught: DraftSettings.from_env()
            self.assertEqual(caught.exception.code, 'DRAFT_ROOT_NOT_CONFIGURED')
        with patch.dict('os.environ', {'DOCUMENT_AGENT_GENERATED_ROOT':str(Path(tempfile.gettempdir()))}):
            self.assertEqual(DraftSettings.from_env().generated_root, Path(tempfile.gettempdir()))

    def test_root_is_file(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)/'file'; root.touch()
            with self.assertRaises(DraftError): DraftSettings(root).root(create=True)
