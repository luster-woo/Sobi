import asyncio
import json
import logging
import re

from pydantic import ValidationError

from ...sources.enums import FieldType
from ..candidates.models import FieldCandidate
from .catalog import SourceCatalog
from .enums import FieldSemanticType as Semantic, MappingStatus as Status
from .errors import SchemaAnalysisError
from .models import SemanticResponse, JoinedField, SchemaAnalysisResult
from .prompt import build_prompt, compact_candidate
from .repair import repair_errors

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2
CALL_TIMEOUT_SECONDS = 75
MAX_RESPONSE_CHARS = 1_000_000
FIXED_PERIOD = re.compile(r"(?<!\d)(?:19|20)\d{2}(?!\d)|전년도|작년")


class ResponseInvalid(ValueError):
    def __init__(self, code, **details):
        super().__init__(code)
        self.details = details


def decode_response(raw):
    if not isinstance(raw, str) or len(raw) > MAX_RESPONSE_CHARS:
        raise ResponseInvalid("RESPONSE_SIZE_OR_TYPE")
    text = raw.strip()
    if text.startswith("```json\n") or text.startswith("```\n"):
        if not text.endswith("```"):
            raise ResponseInvalid("JSON_FORMAT")
        text = text.split("\n", 1)[1][:-3].strip()
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ResponseInvalid("DUPLICATE_JSON_KEY")
            result[key] = value
        return result
    try:
        data = json.loads(text, object_pairs_hook=unique_object)
    except (ValueError, RecursionError):
        raise ResponseInvalid("JSON_FORMAT") from None
    return data


def parse_response(raw):
    return SemanticResponse.model_validate(decode_response(raw))


class GmsSchemaAnalyzer:
    def __init__(self, *, client, source_catalog=None):
        self.client = client
        self.catalog = source_catalog if source_catalog is not None else SourceCatalog()

    async def analyze(self, candidates: list[FieldCandidate]) -> SchemaAnalysisResult:
        # 외부 await 중 호출자의 변경과 결과 alias로부터 위치 정보를 보호한다.
        originals = [candidate.model_copy(deep=True) for candidate in candidates]
        ids = [c.candidate_id for c in originals]
        if len(set(ids)) != len(ids) or any(not value for value in ids):
            raise SchemaAnalysisError("INVALID_CANDIDATE_IDS")
        if not originals:
            return SchemaAnalysisResult()
        system = build_prompt(self.catalog)
        payload = {"candidates": [compact_candidate(c) for c in originals]}
        for attempt in range(MAX_ATTEMPTS):
            try:
                raw = await asyncio.wait_for(self.client.analyze(system_prompt=system,
                    user_payload=json.dumps(payload, ensure_ascii=False)), timeout=CALL_TIMEOUT_SECONDS)
            except Exception:
                raise SchemaAnalysisError("GMS_REQUEST_FAILED") from None
            data = None
            try:
                data = decode_response(raw)
                response = SemanticResponse.model_validate(data)
                by_id = self._validate(response, originals)
                return self._join(originals, by_id)
            except (ValidationError, ResponseInvalid) as exc:
                errors = repair_errors(exc, data, originals, self.catalog)
                payload["repair"] = {
                    "message": "중요: errors의 path가 semantic_type이면 allowed 목록에서 반드시 하나를 선택하세요. mapping_status 값을 semantic_type에 넣어서는 안 됩니다. 불확실성은 mapping_status=NEEDS_REVIEW로 표현하세요. 이전 응답이 validation에 실패했습니다. errors를 수정하여 전체 후보의 전체 결과를 다시 반환하세요. 부분 patch는 허용하지 않습니다.",
                    "errors": errors,
                }
                # 값/label/응답/trace는 로그하지 않는다. debug 활성화 시에도 식별 정보만 기록한다.
                for error in errors:
                    logger.debug("schema_validation_failed attempt=%s code=%s candidate_id=%s path=%s",
                                 attempt + 1, error["code"], error["candidate_id"], error["path"])

        raise SchemaAnalysisError() from None

    def _validate(self, response, candidates):
        fields = response.fields
        ids = [f.candidate_id for f in fields]
        if len(ids) != len(set(ids)):
            raise ResponseInvalid("DUPLICATE_CANDIDATE_ID")
        if set(ids) != {c.candidate_id for c in candidates}:
            raise ResponseInvalid("CANDIDATE_ID_SET_MISMATCH")
        by_id = {f.candidate_id: f for f in fields}
        for candidate in candidates:
            field = by_id[candidate.candidate_id]
            for index, source in enumerate(field.sources):
                details = {"candidate_id": candidate.candidate_id, "path": ("sources", index, "source_key")}
                entry = self.catalog.entries.get(source.source_key)
                if entry is None or source.source_type != entry.source_type:
                    raise ResponseInvalid("SOURCE_PAIR_NOT_ALLOWED", **details, received=source.source_key.value,
                                          allowed=[key.value for key, item in self.catalog.entries.items() if item.source_type == source.source_type])
                try:
                    entry.params_model.model_validate(source.source_params)
                except ValidationError:
                    raise ResponseInvalid("SOURCE_PARAMS_INVALID", candidate_id=candidate.candidate_id,
                                          path=("sources", index, "source_params")) from None
                if source.query_hint is not None and entry.runtime_supported:
                    raise ResponseInvalid("QUERY_HINT_ONLY_FOR_RAG", **details)
                if field.semantic_type == Semantic.DIRECT and entry.field_type != FieldType.DIRECT:
                    raise ResponseInvalid("DIRECT_REQUIRES_DIRECT_KEY", **details)
                if field.semantic_type == Semantic.COMPUTED and entry.field_type != FieldType.COMPUTED:
                    raise ResponseInvalid("COMPUTED_REQUIRES_COMPUTED_KEY", **details)
                # 문서 자체 label/current_text의 명시적 고정 연도를 rolling params로 대체 금지.
                # context는 다른 필드의 연도일 수 있어 이 검사는 적용하지 않는다.
                period_text = candidate.label + " " + (candidate.current_text or "")
                if entry.rolling_period and FIXED_PERIOD.search(period_text):
                    raise ResponseInvalid("FIXED_PERIOD_NOT_SUPPORTED", **details)
        return by_id

    def _join(self, candidates, by_id):
        used = set()
        # 원래 서로 다른 field_key를 가능한 한 보존한다.
        reserved = {field.field_key for field in by_id.values() if field.field_key}
        joined = []
        catalog = self.catalog
        for candidate in candidates:
            field = by_id[candidate.candidate_id].model_copy(deep=True)
            if field.field_key:
                base = field.field_key
                if base in used:
                    index = 2
                    while f"{base}_{index}" in used or f"{base}_{index}" in reserved:
                        index += 1
                    field.field_key = f"{base}_{index}"
                used.add(field.field_key)
            # 사람이 보는 label은 원문이다. semantic key만 LLM 책임이다.
            field.field_label = candidate.label
            supported = (field.mapping_status == Status.RESOLVED
                         and field.semantic_type in (Semantic.DIRECT, Semantic.COMPUTED)
                         and all(catalog.entries[s.source_key].runtime_supported for s in field.sources))
            joined.append(JoinedField(candidate=candidate, analysis=field, runtime_supported=supported))
        return SchemaAnalysisResult(fields=joined)
