import asyncio
import logging
from pathlib import Path

from ..normalizer import DocumentNormalizerService
from ..normalizer.enums import DocumentFormat
from ..parser import HwpxParser
from ..candidates import FieldCandidateExtractor
from ..schema_analyzer import GmsSchemaAnalyzer, GmsSchemaAnalyzerClient
from ..schema_persistence import DocumentSchemaPersistenceService
from .errors import TemplatePreprocessingError
from .models import TemplatePreprocessResult
from .repository import TemplateRepository

logger = logging.getLogger(__name__)


class TemplatePreprocessingService:
    def __init__(self, *, repository=None, normalizer=None, parser=None,
                 extractor=None, analyzer=None, persistence=None):
        self.repository = repository if repository is not None else TemplateRepository()
        self.normalizer = normalizer if normalizer is not None else DocumentNormalizerService()
        self.parser = parser if parser is not None else HwpxParser()
        self.extractor = extractor if extractor is not None else FieldCandidateExtractor()
        self.analyzer = analyzer if analyzer is not None else GmsSchemaAnalyzer(client=GmsSchemaAnalyzerClient())
        self.persistence = persistence if persistence is not None else DocumentSchemaPersistenceService()

    async def preprocess(self, program_document_id: int, source_path: str | Path,
                         output_directory: str | Path, *, original_format: DocumentFormat) -> TemplatePreprocessResult:
        if type(program_document_id) is not int or not 0 < program_document_id <= 9223372036854775807:
            raise TemplatePreprocessingError("INVALID_PROGRAM_DOCUMENT_ID")
        # No public format detector exists. The caller supplies initial NOT NULL metadata;
        # Normalizer remains the sole authority for extension detection and file validation.
        try:
            original_format = DocumentFormat(original_format)
        except (ValueError, TypeError):
            raise TemplatePreprocessingError("INVALID_ORIGINAL_FORMAT") from None
        template_id = await self.repository.start(program_document_id, original_format)
        stage = "normalization"
        try:
            normalized = await asyncio.to_thread(self.normalizer.normalize, source_path, output_directory)
            if normalized.original_format != original_format:
                raise TemplatePreprocessingError("ORIGINAL_FORMAT_MISMATCH")
            stage = "normalized_metadata"
            await self.repository.normalized(template_id, normalized)
            stage = "parsing"
            if normalized.normalized_format != DocumentFormat.HWPX:
                raise TemplatePreprocessingError("PARSER_FORMAT_UNSUPPORTED")
            parsed = await asyncio.to_thread(self.parser.parse, Path(normalized.normalized_path))
            stage = "candidate_extraction"
            candidates = await asyncio.to_thread(self.extractor.extract, parsed)
            stage = "schema_analysis"
            analysis = await self.analyzer.analyze(candidates)
            stage = "schema_persistence"
            saved = await self.persistence.persist(template_id, analysis)
            outcome = TemplatePreprocessResult(
                template_id=template_id, program_document_id=program_document_id,
                normalized_format=normalized.normalized_format, normalized_path=normalized.normalized_path,
                field_count=saved.field_count, source_count=saved.source_count,
            )
            stage = "completion"
            await self.repository.completed(template_id)
            return outcome
        except (Exception, asyncio.CancelledError):
            # Fixed stage descriptions contain no exception text, key, path or document content.
            logger.error("template_preprocessing_failed template_id=%s stage=%s", template_id, stage)
            try:
                await self.repository.failed(template_id, f"Preprocessing failed at {stage}.")
            except Exception:
                logger.error("template_failure_status_write_failed template_id=%s", template_id)
            raise
