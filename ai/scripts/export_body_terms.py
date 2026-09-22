"""제목에 없고 본문에만 있는 변별력 있는 용어를 공고별로 뽑는다.

    python -m scripts.export_body_terms

출력: data/eval/body_terms.md

**왜 필요한가.** 첫 평가셋은 공고 제목을 보고 질의를 썼다. 그러면 제목 단어로
찾을 수 있는 질의만 만들게 되고, 평가셋이 검색에 유리하게 기운다. 실제로
협의 Recall 이 1.000 인데 그 숫자를 곧이곧대로 믿기 어렵다.

본문에만 있는 내용(지원 금액, 대상 품목, 제출 서류, 제외 조건)으로 질의를
쓰면 "제목 매칭"이 아니라 본문까지 닿는지를 재게 된다.

**고르는 기준.** 두 조건을 모두 만족하는 용어만 남긴다.

1. 그 공고 제목에 없다 — 제목으로 찾을 수 있으면 의미가 없다
2. 코퍼스 전체에서 드물다 — 흔한 말은 어느 공고를 가리키지 못한다

질의는 여기서 사람이 쓴다. 자동 생성하면 결국 용어를 그대로 베끼게 되어
문자열 일치를 재는 것으로 돌아간다.
"""

import asyncio
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/eval/body_terms.md"

MAX_DF = 12        # 이보다 많은 공고에 나오면 변별력이 없다
MIN_LEN = 2        # 한 글자는 버린다
TOP_PER_PROGRAM = 14

# 명사구로 보이는 덩어리. 조사·어미가 붙기 전 어근을 대충 잡는다.
TOKEN = re.compile(r"[가-힣]{2,}|[A-Za-z][A-Za-z0-9]{2,}")

# 공고마다 반복되는 행정 용어. 어느 공고를 가리키지 못한다.
STOP = {
    "소상공인", "지원", "사업", "공고", "모집", "신청", "대상", "선정", "참여",
    "제출", "서류", "접수", "기간", "내용", "방법", "문의", "안내", "관련",
    "해당", "경우", "이상", "이하", "이내", "따라", "통해", "위하", "위한",
    "기준", "확인", "필요", "가능", "불가", "제외", "포함", "우선", "본인",
    "사업자", "사업장", "대표자", "등록", "증명", "사본", "발급", "결과",
    "예산", "소진", "변경", "취소", "환수", "기타", "사항", "규정", "정함",
    "년도", "하반기", "상반기", "추가", "차수", "다음", "각각", "또는",
}


async def main() -> None:
    await db.open_pool()
    try:
        async with db.acquire() as conn:
            cur = await conn.execute("""
                SELECT sp.pblanc_id, sp.pblanc_nm,
                       string_agg(c.content, ' ' ORDER BY c.chunk_index) AS body
                FROM support_program sp
                JOIN program_chunk c ON c.support_program_id = sp.id
                WHERE sp.end_date IS NULL OR sp.end_date >= CURRENT_DATE
                GROUP BY sp.pblanc_id, sp.pblanc_nm
                ORDER BY sp.pblanc_nm
            """)
            rows = await cur.fetchall()
    finally:
        await db.close_pool()

    # 공고별 용어 집합과 전체 문서빈도
    per: dict[str, Counter] = {}
    df: Counter = Counter()
    titles: dict[str, str] = {}
    for r in rows:
        pid = r["pblanc_id"][-6:]
        titles[pid] = r["pblanc_nm"]
        title_terms = set(TOKEN.findall(r["pblanc_nm"]))
        c = Counter(t for t in TOKEN.findall(r["body"] or "")
                    if len(t) >= MIN_LEN and t not in STOP and t not in title_terms)
        per[pid] = c
        df.update(c.keys())

    lines = [
        "# 본문 전용 용어",
        "",
        f"공고 {len(rows)}건. 제목에 없고 코퍼스에서 {MAX_DF}건 이하로 나오는 용어만.",
        "",
        "이 목록을 보고 **사람이** 질의를 쓴다. 용어를 그대로 베끼면 문자열",
        "일치를 재게 되므로, 그 용어가 가리키는 **상황**을 일상어로 바꿔 쓴다.",
        "",
        "    본문 용어 `냉난방기`  →  질의 \"에어컨 바꾸는 것도 지원되나요\"",
        "",
        "생성: `python -m scripts.export_body_terms`",
        "",
    ]
    empty = 0
    for pid, c in per.items():
        picked = [(t, n) for t, n in c.most_common()
                  if df[t] <= MAX_DF][:TOP_PER_PROGRAM]
        if not picked:
            empty += 1
            continue
        lines.append(f"## {pid} {titles[pid][:56]}")
        lines.append("  " + "  ".join(f"{t}({n}·df{df[t]})" for t, n in picked))
        lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"공고 {len(rows)}건 / 변별 용어 없는 공고 {empty}건")
    print(f"→ {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
