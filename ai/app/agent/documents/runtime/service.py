from pydantic import ValidationError

from ...sources.enums import SourceKey, SourceType, FieldType
from ...sources.errors import SourceError
from ...sources.models import SourceResolveContext, SourceResolveRequest
from ..schema_analyzer.enums import MappingStatus
from .enums import RuntimeFieldStatus as Status
from .errors import DocumentRuntimeError
from .models import DocumentRuntimeRequest, DocumentRuntimeResult, ResolvedField, RuntimeTemplate
from .computed import ComputedExecutor, ComputationError
from .generated import GeneratedFieldResolver


class DocumentAgentRuntime:
    def __init__(self, *, repository=None, source_resolver=None, gms_client=None):
        if repository is None:
            from .repository import RuntimeRepository
            repository = RuntimeRepository()
        if source_resolver is None:
            from ...sources.postgres import PostgresDataProvider
            from ...sources.service import SourceService
            source_resolver = SourceService(PostgresDataProvider())
        self.repository = repository
        self.source_resolver = source_resolver
        self.generated = GeneratedFieldResolver(source_resolver, gms_client=gms_client)

    async def resolve(self, request: DocumentRuntimeRequest) -> DocumentRuntimeResult:
        try:
            request = DocumentRuntimeRequest.model_validate(request.model_dump(mode="json"))
        except (ValidationError, AttributeError, ValueError):
            raise DocumentRuntimeError("INVALID_RUNTIME_REQUEST") from None
        try:
            loaded = await self.repository.load(request.template_id)
            template = RuntimeTemplate.model_validate(loaded.model_dump()).model_copy(deep=True)
        except DocumentRuntimeError:
            raise
        except Exception:
            raise DocumentRuntimeError("SCHEMA_LOAD_FAILED") from None
        if template.template_id != request.template_id:
            raise DocumentRuntimeError("TEMPLATE_ID_MISMATCH")
        if template.parse_status != "COMPLETED":
            raise DocumentRuntimeError("TEMPLATE_NOT_COMPLETED")
        if template.document_type != "작성용":
            raise DocumentRuntimeError("DOCUMENT_NOT_WRITABLE")
        known = {field.field_key: field for field in template.fields}
        if len(known) != len(template.fields):
            raise DocumentRuntimeError("DUPLICATE_FIELD_KEY")
        context = SourceResolveContext(user_id=request.user_id, support_program_id=template.support_program_id)
        results = []
        for field in sorted(template.fields, key=lambda item: item.field_order):
            field.sources.sort(key=lambda source: (source.priority, source.id))
            data = field.model_dump()
            data["field_schema_id"] = data.pop("id")
            resolved = ResolvedField(**data, runtime_status=Status.ERROR)
            try:
                await self._route(field, resolved, context)
            except Exception:
                resolved.runtime_status = Status.ERROR
                resolved.value = None
                resolved.error_code = "FIELD_RESOLUTION_ERROR"
                resolved.error_message = "필드 값을 확인하지 못했습니다."
            results.append(resolved)
        counts = {status: sum(field.runtime_status == status for field in results) for status in Status}
        return DocumentRuntimeResult(
            template_id=template.template_id, program_document_id=template.program_document_id,
            schema_version=template.schema_version, normalized_format=template.normalized_format,
            normalized_path=template.normalized_path, fields=results, total_fields=len(results),
            status_counts=counts, ready_for_write=all(field.field_type == FieldType.USER_INPUT or not field.required or field.runtime_status == Status.RESOLVED for field in results),
        )

    async def _route(self, field, result, context):
        if field.field_type == FieldType.USER_INPUT:
            result.runtime_status, result.value = Status.LEFT_BLANK, None
        elif field.mapping_status == MappingStatus.UNSUPPORTED:
            result.runtime_status = Status.UNSUPPORTED
        elif field.mapping_status == MappingStatus.NEEDS_REVIEW:
            result.runtime_status = Status.NEEDS_REVIEW
        elif field.field_type == FieldType.COMPUTED:
            await self._computed(field, result, context)
        elif field.field_type == FieldType.GENERATED:
            await self.generated.resolve(field, result, context)
        else:
            await self._direct(field, result, context)

    async def _computed(self, field, result, context):
        executor = ComputedExecutor()
        try:
            definition = executor.prepare(field)
            resolved = await self.source_resolver.resolve_source(context, definition.request)
            result.value = executor.execute(definition, resolved)
            result.runtime_status = Status.RESOLVED
            source = field.sources[0]
            result.source_type, result.source_key, result.source_priority = source.source_type, source.source_key, source.priority
        except ComputationError as exc:
            result.runtime_status, result.error_code = exc.status, exc.code
            result.error_message = str(exc)
        except SourceError as exc:
            result.runtime_status = (Status.UNSUPPORTED if exc.code in {
                "UNSUPPORTED_SOURCE_KEY", "UNSUPPORTED_SOURCE_TYPE", "SOURCE_NOT_IMPLEMENTED"
            } else Status.ERROR)
            result.error_code = exc.code
            result.error_message = "계산 Source 값을 확인하지 못했습니다."

    async def _direct(self, field, result, context):
        if not field.sources:
            result.error_code = "MISSING_SOURCE_DEFINITION"
            result.error_message = "필드의 Source 정의가 없습니다."
            return
        for source in field.sources:
            try:
                source_type, source_key = SourceType(source.source_type), SourceKey(source.source_key)
            except ValueError:
                result.runtime_status, result.error_code = Status.UNSUPPORTED, "UNSUPPORTED_SOURCE_DEFINITION"
                return
            if source_type == SourceType.RAG or source_key == SourceKey.PROGRAM_RAG:
                result.runtime_status, result.error_code = Status.UNSUPPORTED, "RAG_NOT_SUPPORTED"
                return
            try:
                query = SourceResolveRequest(source_type=source_type, source_key=source_key,
                    source_params=source.source_params or {}, query_hint=source.query_hint)
                value = await self.source_resolver.resolve_source(context, query)
            except SourceError as exc:
                result.runtime_status = (Status.UNSUPPORTED if exc.code in {
                    "UNSUPPORTED_SOURCE_KEY", "UNSUPPORTED_SOURCE_TYPE", "SOURCE_NOT_IMPLEMENTED"
                } else Status.ERROR)
                result.error_code = exc.code
                result.error_message = "Source 값을 확인하지 못했습니다."
                return
            if value.source_type != source_type or value.source_key != source_key:
                result.error_code = "SOURCE_RESULT_MISMATCH"
                return
            if not value.found:
                continue
            if value.value is None:
                result.error_code = "INVALID_SOURCE_RESULT"
                return
            result.runtime_status, result.value = Status.RESOLVED, value.value
            result.source_type, result.source_key, result.source_priority = source.source_type, source.source_key, source.priority
            return
        result.runtime_status = Status.VALUE_MISSING

