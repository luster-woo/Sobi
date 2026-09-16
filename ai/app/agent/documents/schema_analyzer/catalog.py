from dataclasses import dataclass

from ...sources.defaults import build_registry
from ...sources.enums import SourceKey, SourceType, FieldType
from ...sources.models import EmptyParams, PeriodParams
from ...sources.resolvers import AmountResolver, direct, business_age, insurance_enrolled, rag_placeholder


@dataclass(frozen=True)
class CatalogEntry:
    source_type: SourceType
    field_type: FieldType
    params_model: type
    runtime_supported: bool
    rolling_period: bool = False


class SourceCatalog:
    def __init__(self):
        registry = build_registry()
        entries = {}
        for key in SourceKey:
            definition = registry.get(key)
            if definition.source_type == SourceType.ACCOUNT:
                continue
            resolver = definition.resolver
            if isinstance(resolver, AmountResolver):
                params, rolling = PeriodParams, True
            elif resolver in (direct, business_age, insurance_enrolled, rag_placeholder):
                params, rolling = EmptyParams, False
            else:
                # 새로운 resolver를 불명확한 params 계약으로 자동 허용하지 않는다.
                raise ValueError("UNSUPPORTED_CATALOG_RESOLVER")
            entries[key] = CatalogEntry(definition.source_type, definition.field_type,
                                        params, resolver is not rag_placeholder, rolling)
        self.entries = entries

    def payload(self):
        return [{"source_key": key.value, "source_type": entry.source_type.value,
                 "field_type": entry.field_type.value,
                 "source_params_schema": entry.params_model.model_json_schema(),
                 "runtime_supported": entry.runtime_supported,
                 "period_policy": "recent completed N months; excludes current month; no calendar year" if entry.rolling_period else None}
                for key, entry in self.entries.items()]
