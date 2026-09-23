from dataclasses import dataclass
from datetime import date
from typing import Protocol

from .enums import FieldType, SourceKey, SourceType
from .errors import SourceError
from .models import SourceResolveContext, SourceResolveRequest, SourceResolveResult
from .provider import DataProvider


class SourceResolver(Protocol):
    async def __call__(
        self, context: SourceResolveContext, request: SourceResolveRequest,
        provider: DataProvider, today: date,
    ) -> SourceResolveResult: ...


@dataclass(frozen=True)
class SourceDefinition:
    source_type: SourceType
    field_type: FieldType
    resolver: SourceResolver


class SourceRegistry:
    def __init__(self) -> None:
        self._entries: dict[SourceKey, SourceDefinition] = {}

    def register(self, key: SourceKey, definition: SourceDefinition) -> None:
        if key in self._entries:
            raise ValueError(f"이미 등록된 SourceKey: {key}")
        self._entries[key] = definition

    def get(self, key: SourceKey) -> SourceDefinition:
        try:
            return self._entries[key]
        except KeyError:
            raise SourceError(
                "UNSUPPORTED_SOURCE_KEY", "등록되지 않은 SourceKey입니다."
            ) from None

