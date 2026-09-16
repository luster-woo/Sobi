from typing import Protocol

from .errors import SchemaAnalysisError


class SchemaAnalyzerLlmClient(Protocol):
    async def analyze(self, *, system_prompt: str, user_payload: str) -> str: ...


class GmsSchemaAnalyzerClient:
    """기존 공용 client를 실제 호출 시점에 import한다. 앱 시작 시 연결하지 않는다."""
    def __init__(self, *, model: str | None = None):
        self.model = model

    async def analyze(self, *, system_prompt: str, user_payload: str) -> str:
        try:
            from app.core import gms
            # 공유 client의 설정은 변경하지 않으며 SDK 자동 재시도도 차단한다.
            client = gms.get_client().with_options(timeout=60.0, max_retries=0)
            completion = await client.chat.completions.create(
                model=self.model or gms.DEFAULT_MODEL,
                response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system_prompt},
                          {"role": "user", "content": user_payload}],
            )
            choice = completion.choices[0]
            if choice.finish_reason != "stop" or not isinstance(choice.message.content, str):
                raise ValueError("INCOMPLETE_RESPONSE")
            return choice.message.content
        except Exception:
            # SDK exception에는 URL/key/원문이 포함될 수 있어 로그와 외부 오류에 전달하지 않는다.
            raise SchemaAnalysisError("GMS_REQUEST_FAILED") from None
