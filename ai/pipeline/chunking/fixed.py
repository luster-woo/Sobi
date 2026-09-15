"""고정 크기 청킹 — 토큰 수만 세어 기계적으로 자른다.

문서 구조(헤딩·문단·표)를 전혀 보지 않는다. 표 중간이든 문장 중간이든
정해진 토큰 수에 도달하면 자른다. 베이스라인이며, 이 단순함이 의도한 것이다.

비교 대상이 될 전략들:
  - structural : 헤딩·항목기호 경계 존중, 표는 독립 청크
  - semantic   : 인접 문단의 임베딩 유사도가 떨어지는 지점에서 절단
"""

from pipeline.chunking.base import Chunk, tokenizer

NAME = "fixed"
DESCRIPTION = "고정 크기 350토큰 / 겹침 50토큰"

CHUNK_TOKENS = 350
OVERLAP_TOKENS = 50
MIN_TAIL_TOKENS = 30  # 이보다 짧은 꼬리 조각은 버린다


def chunk(text: str, title: str) -> list[Chunk]:
    """본문을 고정 크기로 자른다.

    각 청크 앞에 제목을 붙인다. 청크 단독으로는 어느 공고인지 알 수 없기 때문.
    """
    tok = tokenizer()
    header = f"{title}\n"
    header_len = len(tok.encode(header, add_special_tokens=False))
    body_budget = CHUNK_TOKENS - header_len
    if body_budget < 100:
        raise ValueError(f"제목이 너무 길다({header_len}토큰): {title[:50]}")

    ids = tok.encode(text, add_special_tokens=False)
    if not ids:
        return []

    step = body_budget - OVERLAP_TOKENS
    chunks: list[Chunk] = []

    for start in range(0, len(ids), step):
        window = ids[start : start + body_budget]
        if len(window) < MIN_TAIL_TOKENS and chunks:
            break
        body = tok.decode(window, skip_special_tokens=True).strip()
        if body:
            chunks.append(Chunk(header + body, header_len + len(window)))
        if start + body_budget >= len(ids):
            break

    return chunks