import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
from uuid import uuid4

from ..runtime import DocumentAgentRuntime, DocumentRuntimeRequest, DocumentRuntimeError
from ..runtime.repository import RuntimeRepository
from ..writer import HwpxWriter, DocumentWriteError
from .errors import DraftError
from .models import DraftRecord, DraftRequest, DraftResponse
from .store import InMemoryDraftStore

logger = logging.getLogger(__name__)


class TemplateSnapshot:
    """Reuse one validated repository snapshot; avoid a second DB read/race."""
    def __init__(self, template):
        self.template = template.model_copy(deep=True)

    async def load(self, template_id):
        if template_id != self.template.template_id:
            raise DocumentRuntimeError("TEMPLATE_ID_MISMATCH")
        return self.template.model_copy(deep=True)


def build_runtime(repository):
    # Default Runtime enables its existing lazy GeneratedFieldResolver/GMS adapter.
    return DocumentAgentRuntime(repository=repository)


class DraftGenerationService:
    def __init__(self, *, settings, repository=None, runtime_factory=build_runtime, writer=None, store=None):
        self.settings = settings
        self.repository = repository if repository is not None else RuntimeRepository()
        self.runtime_factory = runtime_factory
        self.writer = writer if writer is not None else HwpxWriter()
        self.store = store if store is not None else InMemoryDraftStore()

    async def generate(self, request: DraftRequest) -> DraftResponse:
        stage = "template"
        try:
            logger.info("draft_generation_started template_id=%s", request.template_id)
            template = await self.repository.load(request.template_id)
            if template.template_id != request.template_id:
                raise DraftError("TEMPLATE_ID_MISMATCH")
            if template.parse_status != "COMPLETED":
                raise DraftError("TEMPLATE_NOT_READY", 409)
            if template.document_type != "작성용":
                raise DraftError("DOCUMENT_NOT_WRITABLE", 409)
            source = await asyncio.to_thread(self._source, template)
            stage = "runtime"
            runtime = self.runtime_factory(TemplateSnapshot(template))
            result = await runtime.resolve(DocumentRuntimeRequest(
                template_id=request.template_id, user_id=request.user_id))
            if not result.ready_for_write:
                raise DraftError("DRAFT_NOT_READY", 409, details=[
                    {"fieldKey": f.field_key, "fieldLabel": f.field_label, "status": f.runtime_status.value}
                    for f in result.fields if f.required and f.field_type != "USER_INPUT"
                    and f.runtime_status not in {"RESOLVED", "LEFT_BLANK"}])
            stage = "writer"
            root = await asyncio.to_thread(self.settings.root, create=True)
            draft_id = uuid4()
            name = f"draft-{draft_id}.hwpx"
            output = root / name
            written = await asyncio.to_thread(self.writer.write,
                source_path=source, runtime_result=result, output_path=output)
            response = DraftResponse(draft_id=draft_id, template_id=template.template_id,
                program_document_id=template.program_document_id, file_name=name,
                written_field_count=written.written_count,
                left_blank_field_count=sum(f.runtime_status == "LEFT_BLANK" for f in result.fields),
                unsupported_field_count=sum(f.runtime_status == "UNSUPPORTED" for f in result.fields))
            record = DraftRecord(response, output, datetime.now(timezone.utc))
            stage = "output_check"
            await asyncio.to_thread(self.settings.download_path, record)
            if await asyncio.to_thread(lambda: output.stat().st_size == 0):
                raise DraftError("DRAFT_OUTPUT_INVALID")
            stage = "registration"
            self.store.put(record)
            logger.info("draft_generation_completed template_id=%s program_document_id=%s draft_id=%s written=%s left_blank=%s",
                        template.template_id, template.program_document_id, draft_id,
                        response.written_field_count, response.left_blank_field_count)
            return response
        except DocumentRuntimeError as exc:
            code = {"TEMPLATE_NOT_COMPLETED": "TEMPLATE_NOT_READY"}.get(exc.code, exc.code)
            status = 404 if code == "TEMPLATE_NOT_FOUND" else 409 if code in {
                "TEMPLATE_NOT_READY", "DOCUMENT_NOT_WRITABLE"} else 500
            logger.warning("draft_generation_failed stage=%s code=%s", stage, code)
            raise DraftError(code, status) from None
        except DocumentWriteError as exc:
            logger.warning("draft_generation_failed stage=%s code=%s", stage, exc.code)
            status = 500 if exc.code in {"WRITER_FAILED", "OUTPUT_PUBLISH_FAILED", "OUTPUT_VALIDATION_FAILED"} else 409
            raise DraftError(exc.code, status) from None
        except DraftError as exc:
            logger.warning("draft_generation_failed stage=%s code=%s", stage, exc.code)
            raise
        except Exception:
            logger.warning("draft_generation_failed stage=%s code=DRAFT_GENERATION_FAILED", stage)
            raise DraftError("DRAFT_GENERATION_FAILED") from None

    @staticmethod
    def _source(template):
        if not template.normalized_path:
            raise DraftError("NORMALIZED_FILE_NOT_FOUND", 404)
        source = Path(template.normalized_path)
        if not source.is_file():
            raise DraftError("NORMALIZED_FILE_NOT_FOUND", 404)
        if template.normalized_format != "HWPX" or source.suffix.lower() != ".hwpx":
            raise DraftError("UNSUPPORTED_SOURCE_FORMAT", 409)
        return source
