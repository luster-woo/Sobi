"""골든셋 판정 입력을 한 파일로 내보낸다. DB만 읽고 LLM은 안 부른다.

    python scripts/export_judge_input.py            # doc = 공고 전문
    python scripts/export_judge_input.py --chunks   # doc = 운영과 같은 12청크

출력: data/eval/judge_pack.json
  profiles  프로필ID → 사업자 정보 텍스트
  programs  공고ID   → {name, conditions, doc}
  pairs     [{profile, program, gold}]  골든셋 라벨이 있는 쌍만

이 파일만 있으면 DB 없이 판정을 돌릴 수 있다(scripts/jev_run.py).

**--chunks 를 쓰는 이유.** 기본 모드는 공고 전문을 싣는다. 그런데 운영
(app/rag/search.py)은 전문을 보내지 않는다. 질의 임베딩과 가까운 상위 12청크만
골라 문서 순서로 싣는다. 즉 기본 모드로 잰 정확도는 운영 입력에 대한 값이
아니다. --chunks 는 같은 선택 규칙을 그대로 써서 그 간극을 없앤다.

청크 선택은 프로필마다 다르므로(질의 벡터가 다르다) doc 이 공고가 아니라
**쌍**에 붙는다. pairs[i]["doc"] 이 있으면 jev_run.py 가 그쪽을 쓴다.
"""

import argparse
import asyncio
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core import db
from app.rag import profile as rag_profile
from app.rag.embedding import koe5
from app.rag.search import CHUNKS_PER_PROGRAM

ROOT = Path(__file__).resolve().parents[1]
MAX_DOC = 9000          # 이보다 길면 자격 섹션만 발췌한다
TABLE_KEEP = 400        # 표는 앞부분만 남긴다. 지역 배분표 같은 게 들어 있다

SQL = """
SELECT sp.pblanc_id, sp.pblanc_nm, pc.llm_conditions
FROM support_program sp
JOIN program_condition pc ON pc.support_program_id = sp.id
WHERE sp.pblanc_id = ANY(%(ids)s)
"""

KEY = re.compile(r"(지원\s*대상|신청\s*자격|지원\s*제외|제외\s*대상|모집\s*대상|"
                 r"참여\s*대상|신청\s*대상|지원\s*자격|참가\s*자격|신청\s*요건)")


def shrink(text: str) -> str:
    """표를 앞부분만 남기고 자른다."""
    def cut(m: re.Match) -> str:
        t = m.group()
        return t if len(t) <= TABLE_KEEP else t[:TABLE_KEEP] + " …표 생략]"
    return re.sub(r"<table>.*?</table>", cut, text, flags=re.S)


def excerpt(text: str) -> str:
    """긴 문서에서 자격 관련 블록만 추린다."""
    lines = [l.rstrip() for l in text.split("\n")]
    keep: set[int] = set()
    for i, l in enumerate(lines):
        if KEY.search(l):
            keep.update(range(i, min(i + 16, len(lines))))
    out, prev = [], -2
    for i in sorted(keep):
        if i != prev + 1:
            out.append("  …")
        if lines[i]:
            out.append(lines[i])
        prev = i
    return "\n".join(out)


def doc_of(pblanc_id: str) -> str:
    f = ROOT / f"data/parsed/{pblanc_id}/ocr/{pblanc_id}.md"
    if not f.exists():
        cand = sorted((ROOT / f"data/parsed/{pblanc_id}").rglob("*.md"))
        if not cand:
            return ""
        f = cand[0]
    body = shrink(f.read_text(encoding="utf-8", errors="ignore"))
    if len(body) > MAX_DOC:
        ex = excerpt(body)
        body = ex[:MAX_DOC] if ex.strip() else body[:MAX_DOC]
    return body.strip()


# 운영(app/rag/search.py)과 같은 규칙. 고르는 것은 유사도, 싣는 것은 문서 순서.
CHUNK_SQL = """
SELECT content, chunk_index, rn FROM (
    SELECT c.content, c.chunk_index,
           ROW_NUMBER() OVER (ORDER BY c.embedding <=> %(vec)s::vector) AS rn
    FROM program_chunk c
    JOIN support_program sp ON sp.id = c.support_program_id
    WHERE sp.pblanc_id = %(pid)s
) t
WHERE rn <= %(k)s
ORDER BY rn
"""

# 순위와 함께 저장한다. k 를 바꿀 때마다 DB 를 다시 읽지 않아도 되게.
# jev_run.py --k N 이 rn <= N 을 골라 chunk_index 순으로 싣는다.
MAX_K = 24


def doc_from_chunks(chunks: list, k: int) -> str:
    """상위 k청크를 문서 순서로 잇는다. 운영(search.py)과 같은 규칙."""
    top = [c for c in chunks if c[0] <= k]
    return "\n".join(c[2] for c in sorted(top, key=lambda c: c[1]))


def query_of(u: dict, industry_name: str) -> str:
    """운영과 같은 질의문. 이것으로 임베딩해야 같은 청크가 뽑힌다."""
    od = u.get("open_date")
    return rag_profile.to_query(
        region=u["region"],
        address=u["address"],
        business_name=industry_name,
        business_code=u["business_code"],
        employee_count=u["employee_count"],
        open_date=date.fromisoformat(od) if od else None,
        annual_revenue=u.get("annual_revenue"),
        is_prestartup=bool(u.get("is_prestartup")),
    )


def conditions_of(raw: dict | None) -> str:
    conds = (raw or {}).get("conditions", [])
    if not conds:
        return "(추출된 조건 없음)"
    return "\n".join(
        f"- [{c.get('mode')}/{c.get('direction')}] {c.get('text')}" for c in conds)


def months(open_date: date, today: date) -> int:
    return (today.year - open_date.year) * 12 + today.month - open_date.month


async def main(use_chunks: bool) -> None:
    golden = json.loads((ROOT / "data/eval/golden_set.json").read_text(encoding="utf-8"))
    profiles_raw = golden["profiles"]

    ids = sorted({e["pblancId"]
                  for p in profiles_raw
                  for e in p["expected"] + p["hard_negatives"]})
    codes = sorted({p["user"]["business_code"] for p in profiles_raw})

    await db.open_pool()
    async with db.acquire() as conn:
        cur = await conn.execute(SQL, {"ids": ids})
        rows = {r["pblanc_id"]: r for r in await cur.fetchall()}
        cur = await conn.execute(
            "SELECT code, name, is_std_excluded FROM minor_code WHERE code = ANY(%s)",
            (codes,))
        industry = {r["code"]: (r["name"], r["is_std_excluded"])
                    for r in await cur.fetchall()}

    today = date.today()
    profiles, pairs = {}, []

    for p in profiles_raw:
        u = p["user"]
        name, std = industry.get(u["business_code"], ("?", False))
        birth = date.fromisoformat(u["birth_date"])
        age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

        if u.get("is_prestartup"):
            # 결측이 '모름'이 아니라 '없음'이다. 둘을 섞으면 전부 unknown 이 된다.
            profiles[p["id"]] = (
                f"- 사업자등록: 없음 (예비창업자)\n"
                f"- 주소: {u['address']} (주민등록상 거주지)\n"
                f"- 희망 업종: {name}\n"
                f"- 대표자 연령: 만 {age}세\n"
                f"- 개업일·업력·연매출·상시근로자: 존재하지 않는 값이다.\n"
                f"  확인하지 못한 값이 아니라 아직 사업을 시작하지 않아 없는 값이다."
            )
        else:
            od = date.fromisoformat(u["open_date"])
            profiles[p["id"]] = (
                f"- 사업자등록: 있음\n"
                f"- 주소: {u['address']}\n"
                f"- 업종: {name}\n"
                f"- 표준 융자제외업종: {'해당' if std else '미해당'}\n"
                f"- 대표자 연령: 만 {age}세\n"
                f"- 개업일: {od} (업력 {months(od, today)}개월)\n"
                f"- 상시근로자: {u['employee_count']}명\n"
                f"- 연매출: {u['annual_revenue']:,}원"
            )
        for e in p["expected"] + p["hard_negatives"]:
            pairs.append({"profile": p["id"],
                          "program": e["pblancId"],
                          "gold": e["label"],
                          "prestartup": bool(u.get("is_prestartup"))})

    programs, missing = {}, []
    for pid in ids:
        row = rows.get(pid)
        doc = doc_of(pid)
        if row is None:
            missing.append(pid)
        if not doc:
            missing.append(pid)
        programs[pid] = {
            "name": row["pblanc_nm"] if row else "(제목 없음)",
            "conditions": conditions_of(row["llm_conditions"] if row else None),
            "doc": doc,
        }

    if use_chunks:
        # 프로필별 질의 벡터를 만들어 운영과 같은 청크를 뽑는다.
        vecs = {}
        for p in profiles_raw:
            name, _ = industry.get(p["user"]["business_code"], ("?", False))
            vecs[p["id"]] = koe5.embed_query(query_of(p["user"], name))
        async with db.acquire() as conn:
            for i, pair in enumerate(pairs, 1):
                cur = await conn.execute(CHUNK_SQL, {
                    "vec": vecs[pair["profile"]],
                    "pid": pair["program"],
                    "k": MAX_K,
                })
                pair["chunks"] = [[r["rn"], r["chunk_index"], r["content"]]
                                  for r in await cur.fetchall()]
                pair["doc"] = doc_from_chunks(pair["chunks"], CHUNKS_PER_PROGRAM)
                print(f"\r  청크 {i}/{len(pairs)}", end="", flush=True)
        print()

    await db.close_pool()

    out = {"profiles": profiles, "programs": programs, "pairs": pairs}
    path = ROOT / "data/eval/judge_pack.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    doclen = sorted(len(v["doc"]) for v in programs.values())
    print(f"프로필 {len(profiles)} / 공고 {len(programs)} / 판정쌍 {len(pairs)}")
    print(f"전문 길이  중앙 {doclen[len(doclen)//2]:,}자  최대 {doclen[-1]:,}자")
    if use_chunks:
        cl = sorted(len(x["doc"]) for x in pairs)
        empty = sum(1 for x in cl if x == 0)
        have = sorted(len(x["chunks"]) for x in pairs)
        print(f"청크 길이  중앙 {cl[len(cl)//2]:,}자  최소 {cl[0]:,}  최대 {cl[-1]:,}"
              f"  (빈 쌍 {empty}건)")
        print(f"저장한 청크 수  최대 {MAX_K}  중앙 {have[len(have)//2]}  최소 {have[0]}")
        print(f"  k 스윕: python scripts/jev_run.py --k 4  (재추출 불필요)")
    if missing:
        print(f"결측 {sorted(set(i[-6:] for i in missing))}")
    print(f"→ {path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunks", action="store_true",
                    help="doc 을 운영과 같은 상위 청크로 만든다 (쌍마다 다르다)")
    asyncio.run(main(ap.parse_args().chunks))
