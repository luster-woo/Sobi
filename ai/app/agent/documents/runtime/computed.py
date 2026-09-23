"""Existing computed Source contracts only. No DB, formula inference or arithmetic duplication."""
from dataclasses import dataclass
from decimal import Decimal

from pydantic import ValidationError

from ...sources.enums import FieldType, SourceKey, SourceType
from ...sources.models import SourceResolveRequest, SourceResolveResult
from ..schema_analyzer.catalog import SourceCatalog
from ..schema_analyzer.enums import FieldValueType
from .enums import RuntimeFieldStatus as Status


class ComputationError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__("계산 정의 또는 값을 확인하지 못했습니다.")


@dataclass(frozen=True)
class ComputedDefinition:
    request: SourceResolveRequest
    value_type: FieldValueType


class ComputedExecutor:
    """Pure contract/result adapter; the existing Source Resolver owns actual calculations."""

    VALUE_TYPES = {
        SourceKey.BUSINESS_AGE_MONTHS: FieldValueType.NUMBER,
        SourceKey.REVENUE_SUM: FieldValueType.NUMBER,
        SourceKey.REVENUE_AVERAGE: FieldValueType.NUMBER,
        SourceKey.TAX_SUM: FieldValueType.NUMBER,
        SourceKey.TAX_AVERAGE: FieldValueType.NUMBER,
        SourceKey.INSURANCE_ENROLLED: FieldValueType.BOOLEAN,
    }

    def prepare(self, field) -> ComputedDefinition:
        if len(field.sources) != 1:
            raise ComputationError(Status.VALUE_MISSING, "COMPUTATION_DEFINITION_MISSING")
        source = field.sources[0]
        try:
            key, type_ = SourceKey(source.source_key), SourceType(source.source_type)
        except ValueError:
            raise ComputationError(Status.UNSUPPORTED, "COMPUTATION_SOURCE_UNSUPPORTED") from None
        entry = SourceCatalog().entries.get(key)
        if key not in self.VALUE_TYPES or entry is None or not entry.runtime_supported:
            raise ComputationError(Status.UNSUPPORTED, "COMPUTATION_SOURCE_UNSUPPORTED")
        if entry.source_type != type_ or entry.field_type != FieldType.COMPUTED:
            raise ComputationError(Status.ERROR, "INVALID_COMPUTATION_SOURCE")
        if field.value_type != self.VALUE_TYPES[key]:
            raise ComputationError(Status.ERROR, "INVALID_COMPUTATION_VALUE_TYPE")
        try:
            # Existing EmptyParams/PeriodParams reject unknown rate/cap/dependency parameters.
            entry.params_model.model_validate(source.source_params or {})
            request = SourceResolveRequest(source_type=type_, source_key=key,
                source_params=source.source_params or {}, query_hint=source.query_hint)
        except ValidationError:
            raise ComputationError(Status.ERROR, "INVALID_COMPUTATION_PARAMS") from None
        return ComputedDefinition(request=request, value_type=field.value_type)

    def execute(self, definition: ComputedDefinition, resolved: SourceResolveResult):
        request = definition.request
        if resolved.source_key != request.source_key or resolved.source_type != request.source_type:
            raise ComputationError(Status.ERROR, "COMPUTATION_RESULT_MISMATCH")
        if not resolved.found:
            raise ComputationError(Status.VALUE_MISSING, "COMPUTATION_VALUE_MISSING")
        value = resolved.value
        valid = (type(value) is bool if definition.value_type == FieldValueType.BOOLEAN else
                 type(value) is int or (isinstance(value, Decimal) and value.is_finite()))
        if not valid:
            raise ComputationError(Status.ERROR, "INVALID_COMPUTATION_VALUE")
        # No formatting, float conversion or additional rounding.
        return value
