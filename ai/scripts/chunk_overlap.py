"""여러 공고에 중복으로 들어 있는 문단이 청크를 얼마나 먹는지 센다. DB 필요.

    python -m scripts.chunk_overlap
    python -m scripts.chunk_overlap --min-programs 10   # 더 좁게
    python -m scripts.chunk_overlap --show 20           # 최악 청크 20개
    python -m scripts.chunk_overlap --program 122273    # 공고 하나 해부

**왜 필요한가.** 설명 생성을 눈으로 보다가 발견했다. "찾아가는 1:1 디지털
교육"(122273) 의 상위 12청크가 전부 중소기업기본법 시행령 별표3 — 업종별
매출액·근로자수 표였다. 그 표는 **27개 공고에 똑같이 붙어 있다.**

    프로필 "한식음식점, 3명, 2.4억"
       → 가장 가까운 청크: "40.숙박 및 음식점업 … 평균매출액등15억원이하"

프로필 벡터가 업종·매출액·근로자수로 만들어지니, 정확히 그 항목들로 이뤄진
표보다 더 잘 맞는 것이 공고 안에 없다. **공고를 가릴 힘이 0인 문단이 상위를
차지한다.** 검색에서 안내문서를 뺐던 것과 같은 오염인데 공고 안쪽이다.

**재는 법.** 임베딩을 쓰지 않는다. 청크를 정규화해 문자 조각으로 쪼갠 뒤,
그 조각이 **몇 개 공고**에 나타나는지 센다. 같은 문단이라도 공고마다 표기가
조금씩 다르므로(`colspan=1` vs `colspan="1"`) 정확히 같기를 요구하면 안 된다.
조각 단위로 세면 그 흔들림을 넘어간다.

    흔한 조각  = min_programs 개 이상의 공고에 나오는 조각
    공용도     = 그 청크의 조각 중 흔한 조각의 비율

공용도가 높은 청크는 어느 공고에 있든 같은 말을 한다. BM25 의 IDF 가 용어에
하는 일을 청크에 하는 셈이다.

**이 스크립트는 진단만 한다.** 무엇을 버릴지는 숫자를 보고 정한다.
"""

import argparse
import asyncio
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

import re

from app.core import db

SHINGLE = 12   # 조각 길이(문자). 짧으면 우연히 겹치고 길면 표기 차이에 깨진다
STEP = 4       # 조각을 뜨는 간격. 1이면 정확하지만 12배 느리다

# 정규화. 표기 차이를 지우고 내용만 남긴다.
#   <td colspan="1" rowspan="1">  →  지움 (HTML 표 껍데기)
#   ![](images/ab12….jpg)         →  지움 (이미지 해시. 공고마다 다르다)
_IMG = re.compile(r"!\[\]\([^)]*\)")
_TAG = re.compile(r"<[^>]*>")
_KEEP = re.compile(r"[^가-힣a-zA-Z0-9]")


def normalize(s: str) -> str:
    s = _IMG.sub(" ", s)
    s = _TAG.sub(" ", s)
    return _KEEP.sub("", s).lower()


def shingles(s: str) -> set[str]:
    if len(s) < SHINGLE:
        return {s} if s else set()
    return {s[i:i + SHINGLE] for i in range(0, len(s) - SHINGLE + 1, STEP)}


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-programs", type=int, default=5,
                    help="이 개수 이상의 공고에 나오는 조각을 '흔하다'로 본다")
    ap.add_argument("--ratio", type=float, default=0.5,
                    help="공용도가 이 값을 넘으면 공용 청크로 센다")
    ap.add_argument("--show", type=int, default=10, help="최악 청크 몇 개를 볼지")
    ap.add_argument("--program", default=None,
                    help="공고 하나를 청크별로 해부한다 (pblanc_id 뒤 6자리)")
    args = ap.parse_args()

    await db.open_pool()
    try:
        async with db.acquire() as conn:
            cur = await conn.execute("""
                SELECT sp.pblanc_id, sp.pblanc_nm,
                       c.support_program_id, c.chunk_index, c.content
                FROM program_chunk c
                JOIN support_program sp ON sp.id = c.support_program_id
                WHERE sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE
                ORDER BY c.support_program_id, c.chunk_index
            """)
            rows = await cur.fetchall()
    finally:
        await db.close_pool()

    if not rows:
        print("청크가 없다")
        return

    titles = {r["pblanc_id"][-6:]: r["pblanc_nm"] for r in rows}
    chunks = [{
        "pb": r["pblanc_id"][-6:],
        "idx": r["chunk_index"],
        "text": r["content"],
        "sh": shingles(normalize(r["content"])),
    } for r in rows]

    # 조각 → 그 조각이 나타난 공고 수. 청크 수가 아니라 공고 수를 센다.
    # 한 공고 안에서 표가 여러 청크로 쪼개진 것은 중복이 아니다.
    seen: dict[str, set[str]] = defaultdict(set)
    for c in chunks:
        for s in c["sh"]:
            seen[s].add(c["pb"])
    common = {s for s, ps in seen.items() if len(ps) >= args.min_programs}

    for c in chunks:
        n = len(c["sh"])
        c["ratio"] = (len(c["sh"] & common) / n) if n else 0.0

    n_prog = len({c["pb"] for c in chunks})
    shared = [c for c in chunks if c["ratio"] >= args.ratio]
    print(f"공고 {n_prog}건 / 청크 {len(chunks)}개 / 조각 {len(seen):,}종")
    print(f"흔한 조각({args.min_programs}개 공고 이상) {len(common):,}종 "
          f"= 전체의 {len(common) / len(seen) * 100:.1f}%")
    print(f"\n공용 청크(공용도 {args.ratio:.0%} 이상) "
          f"{len(shared)}개 = 전체의 {len(shared) / len(chunks) * 100:.1f}%")

    # 공용 청크가 어느 공고에 몰려 있나. 적게 가진 공고는 피해가 없다.
    per = Counter(c["pb"] for c in shared)
    total = Counter(c["pb"] for c in chunks)
    print(f"\n공용 청크를 가진 공고 {len(per)}건 "
          f"/ 절반 이상이 공용인 공고 "
          f"{sum(1 for p, n in per.items() if n >= total[p] / 2)}건")

    print(f"\n{'=' * 72}\n공용 청크 비중이 큰 공고 상위 {args.show}\n")
    worst = sorted(per.items(), key=lambda kv: -kv[1] / total[kv[0]])[:args.show]
    for pb, n in worst:
        print(f"  {n:>2}/{total[pb]:<2} ({n / total[pb]:.0%})  {pb}  {titles[pb][:48]}")

    print(f"\n{'=' * 72}\n공용도가 가장 높은 청크 {args.show}\n")
    for c in sorted(chunks, key=lambda c: -c["ratio"])[:args.show]:
        body = " ".join(c["text"].split())
        print(f"  {c['ratio']:.0%}  {c['pb']}#{c['idx']}  {body[:96]}")

    if args.program:
        sel = [c for c in chunks if c["pb"] == args.program]
        if not sel:
            print(f"\n공고 {args.program} 없음")
            return
        print(f"\n{'=' * 72}")
        print(f"{args.program} {titles[args.program][:52]}")
        print(f"청크 {len(sel)}개 중 공용 {sum(1 for c in sel if c['ratio'] >= args.ratio)}개\n")
        for c in sorted(sel, key=lambda c: c["idx"]):
            body = " ".join(c["text"].split())
            mark = "공용" if c["ratio"] >= args.ratio else "고유"
            print(f"  [{mark}] {c['ratio']:>4.0%} #{c['idx']:<3} {body[:88]}")


if __name__ == "__main__":
    asyncio.run(main())
