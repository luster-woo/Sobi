"""DIRECT/COMPUTED 처리. DB 컬럼과 SQL을 알지 못한다."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from .enums import SourceKey, SourceType
from .errors import SourceError
from .models import (
    EmptyParams, PeriodParams,
    SourceResolveContext, SourceResolveRequest, SourceResolveResult,
)
from .provider import DataProvider


def result(request: SourceResolveRequest, value, **metadata) -> SourceResolveResult:
    found = value is not None
    if not found:
        metadata.setdefault("code", "DATA_NOT_FOUND")
    return SourceResolveResult(
        source_type=request.source_type, source_key=request.source_key,
        value=value, found=found, metadata=metadata,
    )


async def direct(context, request, provider, today):
    EmptyParams.model_validate(request.source_params)
    data = await provider.fetch(request.source_type, context)
    return result(request, data.values.get(request.source_key))


async def business_age(context, request, provider, today):
    EmptyParams.model_validate(request.source_params)
    data = await provider.fetch(SourceType.BUSINESS, context)
    opened = data.values.get(SourceKey.OPEN_DATE)
    if opened is None:
        return result(request, None)
    if not isinstance(opened, date) or opened > today:
        raise SourceError("CALCULATION_IMPOSSIBLE", "유효한 개업일로 업력을 계산할 수 없습니다.")
    months = (today.year - opened.year) * 12 + today.month - opened.month
    months -= today.day < opened.day
    return result(request, max(0, months), as_of=today.isoformat(), unit="months")


@dataclass(frozen=True)
class AmountResolver:
    measure: str
    average: bool = False

    async def __call__(
        self, context: SourceResolveContext, request: SourceResolveRequest,
        provider: DataProvider, today: date,
    ) -> SourceResolveResult:
        params = PeriodParams.model_validate(request.source_params)
        end = today.replace(day=1)
        index = end.year * 12 + end.month - 1 - params.months
        year, month = divmod(index, 12)
        if year < 1:
            raise SourceError("INVALID_SOURCE_PARAMS", "months가 조회 가능한 날짜 범위를 초과합니다.")
        start = date(year, month + 1, 1)
        data = await provider.fetch(SourceType.MYDATA, context, start=start, end=end)
        metadata = {
            "months": params.months, "start_date": start.isoformat(),
            "end_date_exclusive": end.isoformat(), "unit": "KRW",
        }
        if not data.monthly_amounts:
            return result(request, None, **metadata)
        # 월별 원천 데이터에 유일 제약이 없으므로 중복을 조용히 합산하지 않는다.
        seen = set()
        total = 0
        for row in data.monthly_amounts:
            period = row.period.replace(day=1)
            amount = getattr(row, self.measure)
            if (period in seen or not start <= period < end
                    or not isinstance(amount, int) or isinstance(amount, bool)):
                raise SourceError("CALCULATION_IMPOSSIBLE", "월별 금액 데이터가 중복되거나 유효하지 않습니다.")
            seen.add(period)
            total += amount
        if len(seen) != params.months:
            raise SourceError("CALCULATION_IMPOSSIBLE", "요청 기간의 월별 데이터가 일부 누락되어 있습니다.")
        value = Decimal(total) / Decimal(params.months) if self.average else total
        return result(request, value, **metadata)


async def insurance_enrolled(context, request, provider, today):
    EmptyParams.model_validate(request.source_params)
    data = await provider.fetch(SourceType.MYDATA, context)
    policies = data.values.get(SourceKey.INSURANCE_LIST)
    return result(request, None if policies is None else bool(policies))


async def rag_placeholder(context, request, provider, today):
    EmptyParams.model_validate(request.source_params)
    raise SourceError("SOURCE_NOT_IMPLEMENTED", "PROGRAM_RAG는 향후 Agent Tool에서 연결합니다.")

