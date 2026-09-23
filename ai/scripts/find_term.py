"""용어가 어느 공고 본문에 있는지 찾는다. 평가셋 라벨링용.

    python -m scripts.find_term 키오스크 냉난방 간판
    python -m scripts.find_term --file terms.txt

제목에도 있으면 `[제목]` 을 붙여 표시한다. 본문에만 있는 용어라야
제목 편향 없는 질의를 쓸 수 있다.
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글 출력이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db

SQL = """
SELECT sp.pblanc_id, sp.pblanc_nm,
       count(*) AS chunks,
       (sp.pblanc_nm ILIKE %(pat)s) AS in_title
FROM support_program sp
JOIN program_chunk c ON c.support_program_id = sp.id
WHERE (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
  AND c.content ILIKE %(pat)s
GROUP BY sp.pblanc_id, sp.pblanc_nm
ORDER BY count(*) DESC
"""

# 용어가 **어떤 맥락으로** 쓰였는지 본다.
#
# 용어가 있다고 정답인 것은 아니다. 특례보증 공고에 "유튜브" 가 있는 것은
# "자세한 내용은 유튜브 채널 참고" 같은 안내이지 유튜브 마케팅 지원이 아니다.
# 문맥을 안 보고 라벨을 달면 틀린 평가셋을 만들게 된다.
CONTEXT_SQL = """
SELECT sp.pblanc_id, c.content
FROM support_program sp
JOIN program_chunk c ON c.support_program_id = sp.id
WHERE (sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE)
  AND c.content ILIKE %(pat)s
ORDER BY sp.pblanc_id, c.chunk_index
"""


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="*")
    ap.add_argument("--file", help="한 줄에 하나씩 적힌 용어 파일")
    ap.add_argument("--max-hit", type=int, default=15,
                    help="이보다 많은 공고에 나오면 목록을 접는다")
    ap.add_argument("--context", type=int, default=0, metavar="N",
                    help="용어 앞뒤 N글자를 같이 보여준다. 라벨을 달기 전에 쓴다")
    args = ap.parse_args()

    terms = list(args.terms)
    if args.file:
        terms += [l.strip() for l in Path(args.file).read_text(encoding="utf-8").split("\n")
                  if l.strip()]

    await db.open_pool()
    try:
        async with db.acquire() as conn:
            for t in terms:
                cur = await conn.execute(SQL, {"pat": f"%{t}%"})
                rows = await cur.fetchall()
                body_only = [r for r in rows if not r["in_title"]]
                print(f"\n### {t}  - 공고 {len(rows)}건 (제목에 없는 것 {len(body_only)}건)")
                if not rows:
                    print("   없음")
                    continue
                if len(rows) > args.max_hit:
                    print(f"   너무 흔하다. 상위 3건만: "
                          + ", ".join(r["pblanc_id"][-6:] for r in rows[:3]))
                    continue
                for r in rows:
                    mark = "[제목]" if r["in_title"] else "      "
                    print(f"   {mark} {r['pblanc_id'][-6:]} ({r['chunks']}청크) "
                          f"{r['pblanc_nm'][:52]}")

                if not args.context:
                    continue
                cur = await conn.execute(CONTEXT_SQL, {"pat": f"%{t}%"})
                seen: set[str] = set()
                for r in await cur.fetchall():
                    pid = r["pblanc_id"][-6:]
                    if pid in seen:      # 공고마다 한 군데만 본다
                        continue
                    seen.add(pid)
                    body = " ".join(r["content"].split())
                    i = body.lower().find(t.lower())
                    if i < 0:
                        continue
                    lo = max(0, i - args.context)
                    snip = body[lo:i + len(t) + args.context]
                    print(f"      · {pid}  …{snip}…")
    finally:
        await db.close_pool()


if __name__ == "__main__":
    asyncio.run(main())
