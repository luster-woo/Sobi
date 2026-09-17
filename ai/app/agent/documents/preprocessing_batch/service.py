import asyncio
import logging

from .errors import BatchError
from .files import resolve_source
from .models import BatchItemResult, BatchOptions
from .store import InMemoryBatchStore

logger = logging.getLogger(__name__)


class BatchPreprocessingService:
    def __init__(self, *, settings, repository, preprocessor, store=None):
        self.settings = settings
        self.repository = repository
        self.preprocessor = preprocessor
        self.store = store if store is not None else InMemoryBatchStore()

    def start(self):
        self.settings.validate()
        return self.store.create()

    def get(self, batch_id):
        return self.store.get(batch_id)

    async def run(self, batch_id, options: BatchOptions):
        self.store.claim(batch_id)
        try:
            documents = await self.repository.list_documents()
            self.store.set_total(batch_id, len(documents))
            for document in documents:
                item = await self._process(document, options)
                self.store.add_item(batch_id, item)
            self.store.finish(batch_id)
        except asyncio.CancelledError:
            self.store.finish(batch_id, "BATCH_CANCELLED")
            raise
        except Exception:
            logger.error("batch_execution_failed batch_id=%s", batch_id)
            self.store.finish(batch_id, "BATCH_EXECUTION_FAILED")
        finally:
            self.store.release(batch_id)
        return self.store.get(batch_id)

    async def _process(self, document, options):
        document_id = document["program_document_id"]
        template_id = document["template_id"]
        state = document["parse_status"]
        skip = (state == "PARSING" or (state == "COMPLETED" and not options.reprocess_completed)
                or (state == "FAILED" and not options.retry_failed))
        if skip:
            return BatchItemResult(program_document_id=document_id, template_id=template_id,
                                   status="SKIPPED", error_code="POLICY_SKIP_" + state)
        try:
            source, output, format_ = await asyncio.to_thread(resolve_source, self.settings, document_id)
            saved = await self.preprocessor.preprocess(document_id, source, output, original_format=format_)
            return BatchItemResult(program_document_id=document_id, template_id=saved.template_id, status="COMPLETED")
        except BatchError as exc:
            code = exc.code
        except Exception:
            # Never store arbitrary exception text/code from dependencies or document contents.
            code = "PREPROCESSING_FAILED"
        logger.warning("batch_item_failed document_id=%s code=%s", document_id, code)
        return BatchItemResult(program_document_id=document_id, template_id=template_id, status="FAILED",
                               error_code=code, error_message="문서 전처리에 실패했습니다.")


def build_service(store=None):
    from ..preprocessing import TemplatePreprocessingService
    from .config import BatchSettings
    from .repository import BatchDocumentRepository
    return BatchPreprocessingService(settings=BatchSettings.from_env(), repository=BatchDocumentRepository(),
                                     preprocessor=TemplatePreprocessingService(), store=store)
