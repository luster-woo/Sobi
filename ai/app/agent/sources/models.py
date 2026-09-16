from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from .enums import SourceKey, SourceType

PositiveId = Annotated[int, Field(strict=True, gt=0)]


class SourceResolveContext(BaseModel):
    """신뢰된 호출자가 공급하는 식별자. HTTP 인증 자체를 대체하지 않는다."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    user_id: PositiveId | None = None
    support_program_id: PositiveId | None = None


class SourceResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_type: SourceType
    source_key: SourceKey
    source_params: dict[str, JsonValue] = Field(default_factory=dict)
    query_hint: str | None = None


class SourceResolveResult(BaseModel):
    source_type: SourceType
    source_key: SourceKey
    value: date | Decimal | JsonValue = None
    found: bool
    metadata: dict[str, JsonValue] = Field(default_factory=dict)


class PeriodParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    months: Annotated[int, Field(strict=True, gt=0)]


class EmptyParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

