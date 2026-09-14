"""SSAFY GMS (OpenAI 호환) 클라이언트."""

from openai import AsyncOpenAI

from app.core import config

DEFAULT_MODEL = "gpt-4.1-mini"

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=config.GMS_API_KEY,
            base_url=config.GMS_BASE_URL,
            timeout=60.0,
        )
    return _client