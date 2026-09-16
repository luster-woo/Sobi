"""저장 방식과 분리된 논리 데이터 계약. SQL은 postgres.py에만 둔다."""

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Protocol

from .enums import SourceKey, SourceType
from .models import SourceResolveContext


@dataclass(frozen=True)
class MonthlyAmounts:
    period: date
    revenue: int
    tax: int


@dataclass
class SourceData:
    values: dict[SourceKey, Any] = field(default_factory=dict)
    monthly_amounts: list[MonthlyAmounts] = field(default_factory=list)


class DataProvider(Protocol):
    async def fetch(
        self,
        source_type: SourceType,
        context: SourceResolveContext,
        *,
        start: date | None = None,
        end: date | None = None,
    ) -> SourceData:
        """엔티티 부재는 SourceError(missing=True), 장애는 일반 예외.

        MYDATA의 start/end는 시작 포함, 종료 제외인 월 경계.
        기간 요청 시 monthly_amounts, 그 외에는 보험 정보를 반환한다.
        """
        ...

