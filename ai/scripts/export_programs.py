"""공고 목록을 한 파일로 뽑는다. 검색 평가셋을 만들 때 쓴다.

    python -m scripts.export_programs

출력: data/eval/programs.tsv  (pblanc_id / 유형 / 지역 / 마감 / 제목)

질의를 먼저 쓰고 정답을 고르면, 검색이 잘 찾을 만한 질의만 쓰게 된다.
목록을 먼저 보고 "이 공고를 찾아야 하는 질의"를 쓰기 위한 파일이다.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/eval/programs.tsv"

SQL = """
SELECT sp.pblanc_id,
       COALESCE(sp.type, '-')                    AS type,
       CASE WHEN cond.nationwide THEN '전국'
            ELSE COALESCE(cond.region_sido, '-') END AS region,
       COALESCE(cond.target_scale, '-')          AS scale,
       CASE WHEN sp.end_date IS NULL THEN '상시'
            WHEN sp.end_date < CURRENT_DATE THEN '마감'
            ELSE to_char(sp.end_date, 'MM-DD') END AS deadline,
       (SELECT count(*) FROM program_chunk c
         WHERE c.support_program_id = sp.id)     AS chunks,
       sp.pblanc_nm
FROM support_program sp
LEFT JOIN program_condition cond ON cond.support_program_id = sp.id
ORDER BY region, sp.pblanc_nm
"""


async def main() -> None:
    await db.open_pool()
    try:
        async with db.acquire() as conn:
            cur = await conn.execute(SQL)
            rows = await cur.fetchall()
    finally:
        await db.close_pool()

    cols = ["pblanc_id", "type", "region", "scale", "deadline", "chunks", "제목"]
    lines = ["\t".join(cols)]
    for r in rows:
        lines.append("\t".join([
            r["pblanc_id"][-6:],          # 뒤 6자리면 식별에 충분하다
            str(r["type"]),
            str(r["region"]),
            str(r["scale"]),
            str(r["deadline"]),
            str(r["chunks"]),
            r["pblanc_nm"].replace("\t", " ").strip(),
        ]))
    OUT.write_text("\n".join(lines), encoding="utf-8")

    live = sum(1 for r in rows if r["deadline"] != "마감")
    nochunk = sum(1 for r in rows if r["chunks"] == 0)
    print(f"공고 {len(rows)}건 (접수중·상시 {live}건)")
    if nochunk:
        print(f"청크 0건인 공고 {nochunk}건 — 검색으로 절대 찾을 수 없다")
    print(f"→ {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
