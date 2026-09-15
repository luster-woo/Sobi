"""청킹 전략 공용 요소."""

from dataclasses import dataclass
from functools import lru_cache

from transformers import AutoTokenizer

MODEL_NAME = "nlpai-lab/KoE5"
MAX_TOKENS = 512  # KoE5 입력 한계. "passage: " 프리픽스 3토큰 포함


@dataclass
class Chunk:
    content: str
    token_count: int


@lru_cache(maxsize=1)
def tokenizer():
    return AutoTokenizer.from_pretrained(MODEL_NAME)


def count(text: str) -> int:
    return len(tokenizer().encode(text, add_special_tokens=False))