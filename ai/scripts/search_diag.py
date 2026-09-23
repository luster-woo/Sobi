"""질의별 거리 분포를 본다. 컷오프가 무엇을 자르는지 보려는 용도.

    python -m scripts.search_diag

search.py 의 컷오프는 두 상수로 정해진다.

    limit = LEAST(MIN(distance) + DISTANCE_MARGIN, MAX_DISTANCE)

MAX_DISTANCE 가 절대 상한이라, 그 질의의 최상위 문서가 MAX_DISTANCE 보다
멀면 통과하는 것이 하나도 없다. 상대 여유가 작동할 기회조차 없다.
결과 0건 질의가 그 경우인지 여기서 확인한다.
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db
from app.rag import search as rag_search
from app.rag.embedding import koe5

ROOT = Path(__file__).resolve().parents[1]
SET = ROOT / "data/eval/search_set.json"

# 컷오프를 걸지 않고 전 공고의 거리를 본다.
SQL = """
SELECT sp.pblanc_id, MIN(c.embedding <=> %(vec)s::vector) AS distance
FROM program_chunk c
JOIN support_program sp ON sp.id = c.support_program_id
WHERE sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE
GROUP BY sp.pblanc_id
ORDER BY distance
"""


async def main() -> None:
    data = json.loads(SET.read_text(encoding="utf-8"))
    await db.open_pool()
    try:
        print(f"{'최소':>6}{'컷오프':>8}{'통과':>6}{'정답최상':>9}{'정답순위':>9}  질의")
        rows = []
        async with db.acquire() as conn:
            for q in data["queries"]:
                vec = await asyncio.to_thread(koe5.embed_query, q["query"])
                cur = await conn.execute(SQL, {"vec": vec})
                res = [(r["pblanc_id"][-6:], r["distance"]) for r in await cur.fetchall()]
                lo = res[0][1]
                limit = min(lo + rag_search.DISTANCE_MARGIN, rag_search.MAX_DISTANCE)
                passed = sum(1 for _, d in res if d <= limit)

                must = set(q["must"])
                hit = [(i, pb, d) for i, (pb, d) in enumerate(res, 1) if pb in must]
                best = f"{hit[0][2]:.3f}" if hit else "-"
                rank = f"{hit[0][0]}위" if hit else "-"
                q["_res"] = res          # 스윕에서 다시 쓴다
                rows.append((q, lo, limit, passed, hit))
                print(f"{lo:>6.3f}{limit:>8.3f}{passed:>6}{best:>9}{rank:>9}  {q['query'][:34]}")

        # MAX_DISTANCE 를 훑는다. 최소거리만으로는 실제 질의와 무관 질의가
        # 겹치므로 최적값이 없다. 무엇을 얼마에 사는지만 보고 고른다.
        print(f"\n{'상한':>6}{'협의R':>8}{'광의P':>8}{'무관누출':>9}{'평균건수':>9}")
        for cap in [0.55, 0.60, 0.62, 0.65, 0.68, 0.70, 0.72, 0.75]:
            rec, prec, leak, cnt = [], [], 0, []
            for q, lo, _, _, hit in rows:
                limit = min(lo + rag_search.DISTANCE_MARGIN, cap)
                passed = [pb for pb, d in q["_res"] if d <= limit][:10]
                cnt.append(len(passed))
                if q["type"] == "negative":
                    leak += 1 if passed else 0
                elif q["type"] == "narrow":
                    rec.append(len(set(q["must"]) & set(passed)) / len(q["must"]))
                else:
                    good = [p for p in passed if p in set(q["must"]) | set(q["ok"])]
                    prec.append(len(good) / len(passed) if passed else 0.0)
            print(f"{cap:>6.2f}{sum(rec)/len(rec):>8.3f}{sum(prec)/len(prec):>8.3f}"
                  f"{leak:>6}/{sum(1 for q,*_ in rows if q['type']=='negative')}"
                  f"{sum(cnt)/len(cnt):>9.1f}")

        print("\n결과 0건이었던 질의의 정답 거리")
        for q, lo, limit, passed, hit in rows:
            if passed:
                continue
            print(f"\n■ {q['query']}   (최소거리 {lo:.3f} > 상한 {rag_search.MAX_DISTANCE})")
            for i, pb, d in hit[:3]:
                print(f"    정답 {pb}  거리 {d:.3f}  전체 {i}위")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
