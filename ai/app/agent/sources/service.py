"""Agent가 호출하는 경계. 예외를 안전한 코드로 변환하며 SQL을 노출하지 않는다."""

from datetime import date
from typing import Callable

from pydantic import ValidationError

from .errors import SourceError
from .models import SourceResolveContext, SourceResolveRequest, SourceResolveResult
from .provider import DataProvider
from .registry import SourceRegistry


class SourceService:
    def __init__(
        self, provider: DataProvider, registry: SourceRegistry | None = None,
        *, today: Callable[[], date] = date.today,
    ):
        if registry is None:
            from .defaults import build_registry
            registry = build_registry()
        self.provider = provider
        self.registry = registry
        self.today = today

    async def resolve_source(
        self, context: SourceResolveContext, source: SourceResolveRequest,
    ) -> SourceResolveResult:
        return await self._resolve(context, source, self.today())

    async def _resolve(self, context, source, today):
        try:
            definition = self.registry.get(source.source_key)
            if definition.source_type != source.source_type:
                raise SourceError("SOURCE_TYPE_MISMATCH", "SourceKey와 SourceType이 일치하지 않습니다.")
            value = await definition.resolver(context, source, self.provider, today)
            value.metadata["field_type"] = definition.field_type.value
            return value
        except ValidationError as exc:
            # 검증 위치/유형만 사용한다. errors()의 input/ctx는 외부로 보내지 않는다.
            issues = []
            for issue in exc.errors(include_input=False, include_context=False, include_url=False):
                name = str(issue["loc"][0]) if issue["loc"] else "source_params"
                safe_name = name if name in {"months"} else "source_params"
                issues.append(f"{safe_name}: {issue['type']}")
            raise SourceError(
                "INVALID_SOURCE_PARAMS", "조회 파라미터를 확인해주세요 (" + ", ".join(issues) + ")."
            ) from None
        except SourceError as exc:
            if not exc.missing:
                raise
            return SourceResolveResult(
                source_type=source.source_type, source_key=source.source_key,
                value=None, found=False, metadata=exc.as_dict(),
            )
        except Exception:
            # 내부 예외/SQL/개인정보를 결과와 메시지에 포함하지 않는다.
            raise SourceError("SOURCE_SYSTEM_ERROR", "데이터 조회 중 시스템 오류가 발생했습니다.") from None

    async def resolve_sources(
        self, context: SourceResolveContext, sources: list[SourceResolveRequest],
    ) -> list[SourceResolveResult]:
        """입력 순서/중복 키 보존. 잘못된 요청/장애는 중단, 단순 부재는 found=False."""
        today = self.today()
        return [await self._resolve(context, source, today) for source in sources]
