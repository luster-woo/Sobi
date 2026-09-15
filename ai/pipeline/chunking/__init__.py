"""청킹 전략 등록소.

새 전략을 추가하려면 모듈을 만들고 STRATEGIES에 등록한다.
모듈은 NAME, DESCRIPTION, chunk(text, title) -> list[Chunk] 를 제공해야 한다.

    python scripts/test_chunking.py fixed
"""

from pipeline.chunking import fixed
from pipeline.chunking.base import Chunk, count, tokenizer

STRATEGIES = {
    fixed.NAME: fixed,
}

DEFAULT = fixed.NAME


def get(name: str):
    if name not in STRATEGIES:
        raise KeyError(f"모르는 전략: {name}. 가능한 값: {', '.join(STRATEGIES)}")
    return STRATEGIES[name]


__all__ = ["Chunk", "count", "tokenizer", "STRATEGIES", "DEFAULT", "get"]