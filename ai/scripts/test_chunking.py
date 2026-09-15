"""청킹 전략 비교. 전략 이름을 인자로 받는다.

    python scripts/test_chunking.py          # 기본 전략 
    python scripts/test_chunking.py fixed
"""

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.chunking as chunking

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_ID = "PBLN_000000000121646"  # 안동 카드수수료 (골든셋 P05 정답)


def load_sources() -> list[tuple[str, Path]]:
    out = [(p.parent.parent.name, p) for p in (ROOT / "data/parsed").rglob("*.md")]
    out += [(p.stem, p) for p in (ROOT / "data/parsed_hwp").glob("*.md")]
    out += [(p.stem, p) for p in (ROOT / "data/parsed_hwpx").glob("*.md")]
    return out


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else chunking.DEFAULT
    strategy = chunking.get(name)
    print(f"전략: {strategy.NAME} — {strategy.DESCRIPTION}\n")

    items = json.loads((ROOT / "data/raw/bizinfo_all.json").read_text(encoding="utf-8"))
    titles = {it["pblancId"]: it.get("pblancNm", "") for it in items}

    sources = load_sources()
    total = 0
    per_doc: list[tuple[int, str]] = []
    hist: Counter = Counter()

    for pid, path in sources:
        text = path.read_text(encoding="utf-8", errors="replace")
        chunks = strategy.chunk(text, titles.get(pid, pid))
        total += len(chunks)
        per_doc.append((len(chunks), pid))
        for c in chunks:
            hist[c.token_count // 50 * 50] += 1

    print(f"문서 {len(sources)}건 → 청크 {total}개 (문서당 평균 {total / len(sources):.1f})")

    over = sum(n for b, n in hist.items() if b >= chunking.base.MAX_TOKENS)
    if over:
        print(f"경고: 512토큰 초과 청크 {over}개 — 임베딩 시 잘린다")

    print("\n토큰 수 분포")
    for bucket in sorted(hist):
        print(f"  {bucket:>3}~{bucket + 49:>3} {'#' * (hist[bucket] // 20)} {hist[bucket]}")

    per_doc.sort(reverse=True)
    print("\n청크 많은 문서")
    for n, pid in per_doc[:5]:
        print(f"  {n:>3}개  {pid}  {titles.get(pid, '')[:45]}")

    for pid, path in sources:
        if pid == SAMPLE_ID:
            chunks = strategy.chunk(path.read_text(encoding="utf-8"), titles.get(pid, pid))
            print(f"\n=== 샘플 {SAMPLE_ID} — 청크 {len(chunks)}개 중 앞 2개 ===")
            for c in chunks[:2]:
                print(f"\n--- {c.token_count}토큰 ---\n{c.content}")
            break


if __name__ == "__main__":
    main()