from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

from ...sources.enums import SourceKey, SourceType
from ..candidates.models import FieldCandidate
from .enums import FieldSemanticType as Semantic, MappingStatus as Status, FieldValueType


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalyzedFieldSource(StrictModel):
    source_type: SourceType
    source_key: SourceKey
    required: bool = Field(default=True, strict=True)
    priority: int = Field(default=1, ge=1, strict=True)
    query_hint: str | None = Field(default=None, max_length=500)
    source_params: dict[str, JsonValue] = Field(default_factory=dict)


class AnalyzedField(StrictModel):
    candidate_id: str = Field(min_length=1)
    semantic_type: Semantic
    field_key: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")
    field_label: str | None = None
    value_type: FieldValueType | None = None
    required: bool = Field(default=False, strict=True)
    instruction: str | None = Field(default=None, max_length=2000)
    mapping_status: Status
    sources: list[AnalyzedFieldSource] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    note: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def contracts(self):
        if self.semantic_type in (Semantic.IGNORE, Semantic.USER_INPUT) and self.sources:
            raise ValueError("NO_SOURCES_ALLOWED")
        if self.semantic_type == Semantic.IGNORE:
            if self.field_key is not None:
                raise ValueError("IGNORE_KEY_NOT_ALLOWED")
        elif self.field_key is None or self.value_type is None:
            raise ValueError("FIELD_KEY_AND_VALUE_TYPE_REQUIRED")
        if (self.semantic_type in (Semantic.DIRECT, Semantic.COMPUTED, Semantic.GENERATED)
                and self.mapping_status == Status.RESOLVED and not self.sources):
            raise ValueError("RESOLVED_REQUIRES_SOURCES")
        if self.semantic_type == Semantic.GENERATED and not self.sources and self.mapping_status != Status.NEEDS_REVIEW:
            raise ValueError("GENERATED_WITHOUT_SOURCES_NEEDS_REVIEW")
        return self


class SemanticResponse(StrictModel):
    fields: list[AnalyzedField]


class JoinedField(StrictModel):
    candidate: FieldCandidate
    analysis: AnalyzedField
    # RESOLVED도 runtime 값 조회 성공을 보장하지 않는다.
    runtime_supported: bool


class SchemaAnalysisResult(StrictModel):
    fields: list[JoinedField] = Field(default_factory=list)
