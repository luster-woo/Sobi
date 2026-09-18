from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from ...sources.enums import FieldType
from ..schema_analyzer.enums import MappingStatus, FieldValueType
from .enums import RuntimeFieldStatus

Id = Annotated[int, Field(strict=True, gt=0, le=9223372036854775807)]


class DocumentRuntimeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template_id: Id
    user_id: Id


class RuntimeSource(BaseModel):
    id: Id
    # Preserve stored definitions, including unsupported future keys, for per-field routing.
    source_type: str
    source_key: str | None = None
    required: bool
    priority: int = Field(ge=1)
    query_hint: str | None = None
    source_params: dict[str, JsonValue] | None = None


class RuntimeFieldSchema(BaseModel):
    id: Id
    field_key: str
    field_label: str
    field_order: int = Field(ge=0)
    field_type: FieldType
    value_type: FieldValueType
    mapping_status: MappingStatus
    required: bool
    instruction: str | None = None
    min_length: int | None = None
    max_length: int | None = None
    constraints: JsonValue = None
    location_info: dict[str, JsonValue]
    sources: list[RuntimeSource] = Field(default_factory=list)


class RuntimeTemplate(BaseModel):
    template_id: Id
    program_document_id: Id
    support_program_id: Id
    document_type: str
    parse_status: str
    schema_version: int
    normalized_format: str | None = None
    normalized_path: str | None = None
    fields: list[RuntimeFieldSchema] = Field(default_factory=list)


class ResolvedField(BaseModel):
    field_schema_id: Id
    field_key: str
    field_label: str
    field_order: int
    field_type: FieldType
    value_type: FieldValueType
    mapping_status: MappingStatus
    required: bool
    instruction: str | None = None
    min_length: int | None = None
    max_length: int | None = None
    constraints: JsonValue = None
    location_info: dict[str, JsonValue]
    sources: list[RuntimeSource]
    runtime_status: RuntimeFieldStatus
    value: date | Decimal | JsonValue = None
    source_type: str | None = None
    source_key: str | None = None
    source_priority: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    missing_information: list[str] = Field(default_factory=list)


class DocumentRuntimeResult(BaseModel):
    template_id: Id
    program_document_id: Id
    schema_version: int
    normalized_format: str | None = None
    normalized_path: str | None = None
    fields: list[ResolvedField]
    total_fields: int
    status_counts: dict[RuntimeFieldStatus, int]
    ready_for_write: bool
