"""설명 생성을 눈으로 확인하고 토큰을 잰다. DB 와 GMS 크레딧이 필요하다.

    python -m scripts.explain_run                 # 골든셋에서 6쌍 (판정별 2개씩)
    python -m scripts.explain_run --limit 12
    python -m scripts.explain_run --status unknown
    python -m scripts.explain_run --dry           # 호출 없이 입력만 본다

**--dry 를 먼저 돌려라.** 크레딧을 쓰기 전에 모델에 무엇이 들어가는지
확인하는 용도다. 입력이 잘못돼 있으면 출력을 봐도 알 수 없다.

쌍은 data/eval/golden_set.json 에서 가져온다. 거기 `expected` 와
`hard_negatives` 에 사람이 붙인 라벨이 있어서, 그것을 판정 결과로 넣는다.
**여기서 재는 것은 판정 정확도가 아니라 설명 문장의 품질이다.** 판정이 맞다고
치고, 그 판정을 사람에게 설명하는 문장이 쓸 만한지를 본다.
"""

import argparse
import asyncio
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

import json

from dotenv import load_dotenv

load_dotenv()

from app.core import db
from app.rag import explain as explain_mod
from app.rag import recommend, search

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = ROOT / "data/eval/golden_set.json"
OUT = ROOT / "data/eval/explain_runs"


def _date(v):
    return date.fromisoformat(v) if v else None


def pairs(limit: int, only: str | None) -> list[dict]:
    """골든셋을 (프로필, 공고, 판정) 쌍으로 편다. 판정별로 고르게 섞는다."""
    data = json.loads(GOLDEN.read_text(encoding="utf-8"))
    by_status: dict[str, list[dict]] = {}
    for p in data["profiles"]:
        for key in ("expected", "hard_negatives"):
            for e in p.get(key, []):
                by_status.setdefault(e["label"], []).append({
                    "profile": p, "pblanc_id": e["pblancId"],
                    "status": e["label"], "why": e.get("why", ""),
                })

    if only:
        return by_status.get(only, [])[:limit]

    # 라운드로빈. 한 판정만 몰려서 나오면 다른 경우를 못 본다.
    out: list[dict] = []
    buckets = [iter(v) for v in by_status.values()]
    while buckets and len(out) < limit:
        for it in list(buckets):
            try:
                out.append(next(it))
            except StopIteration:
                buckets.remove(it)
            if len(out) >= limit:
                break
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=6)
    ap.add_argument("--status", default=None,
                    choices=["eligible", "ineligible", "unknown"])
    ap.add_argument("--dry", action="store_true",
                    help="GMS 를 부르지 않고 입력만 출력한다")
    ap.add_argument("--save", action="store_true",
                    help="생성 결과를 data/eval/explain_runs/ 에 남긴다. "
                         "채점(scripts/eval_explain.py)은 이 파일을 읽으므로 "
                         "다시 생성하지 않는다 = 크레딧이 더 들지 않는다")
    ap.add_argument("--chunks", type=int, default=None,
                    help="설명에 실을 청크 수(EXPLAIN_CHUNKS). 비용이 여기 걸려 있다")
    ap.add_argument("--repeat", type=int, default=1,
                    help="같은 입력을 여러 번 돌린다. temperature=0 이어도 "
                         "출력이 달라지므로 한 번만 보고 판단하면 안 된다")
    args = ap.parse_args()

    if args.chunks is not None:
        search.EXPLAIN_CHUNKS = args.chunks

    sel = pairs(args.limit, args.status)
    if not sel:
        print("쌍이 없다")
        return
    print(f"쌍 {len(sel)}개  모델 {explain_mod.gms.DEFAULT_MODEL}  "
          f"청크 {search.EXPLAIN_CHUNKS}  반복 {args.repeat}  "
          f"{'입력만(호출 없음)' if args.dry else 'GMS 호출'}")

    # 도중에 끊겨도 그때까지 만든 것은 남긴다. 크레딧을 이미 쓴 결과다.
    tot_in = tot_out = 0
    done = 0
    saved: list[dict] = []

    await db.open_pool()
    try:
        async with db.acquire() as conn:
            cur = await conn.execute("SELECT id, pblanc_id FROM support_program")
            pb2id = {r["pblanc_id"]: r["id"] for r in await cur.fetchall()}

        for i, s in enumerate(sel, 1):
            pid = pb2id.get(s["pblanc_id"])
            u = s["profile"]["user"]
            if pid is None:
                print(f"\n[{i}] 공고 없음 {s['pblanc_id']}")
                continue

            kw = dict(
                region=u["region"], address=u["address"],
                business_code=u["business_code"],
                employee_count=u["employee_count"],
                open_date=_date(u.get("open_date")),
                annual_revenue=u.get("annual_revenue"),
                birth_date=_date(u.get("birth_date")),
                is_prestartup=u.get("is_prestartup", False),
            )

            hit, industry, excluded = await search.hit_for_program(pid, **{
                k: v for k, v in kw.items() if k != "birth_date"})
            title = hit.title if hit else "(원문 없음)"
            print(f"\n{'=' * 72}")
            print(f"[{i}] {s['profile']['id']} {s['profile']['desc']}")
            print(f"    공고 {title[:52]}")
            print(f"    판정 {s['status']}  |  라벨 근거: {s['why'][:60]}")

            if args.dry:
                if hit is None:
                    print("    원문 없음 — 생성 대상 아님")
                    continue
                block = recommend.format_profile(
                    address=u["address"], industry_name=industry,
                    std_excluded=excluded,
                    employee_count=u["employee_count"],
                    open_date=_date(u.get("open_date")),
                    annual_revenue=u.get("annual_revenue"),
                    birth_date=_date(u.get("birth_date")),
                    is_prestartup=u.get("is_prestartup", False))
                state = recommend.build_state(hit, block)
                print(f"    청크 {len(hit.chunks)}개  입력 {len(state):,}자")
                print("-" * 72)
                print(state[:1500])
                print("... (생략)" if len(state) > 1500 else "")
                continue

            for n in range(args.repeat):
                r = await explain_mod.explain(program_id=pid, status=s["status"], **kw)
                if r is None:
                    print("    → 생성 실패 또는 대상 아님")
                    continue
                done += 1
                tot_in += r.prompt_tokens
                tot_out += r.completion_tokens
                if n == 0:
                    print(f"    입력 {r.prompt_tokens:,} + 출력 {r.completion_tokens:,} "
                          f"= {r.total_tokens:,}토큰  {r.credits:.1f}크레딧")
                print("-" * 72)
                print(r.text)

                if args.save:
                    # 채점에 필요한 것을 전부 담는다. 채점기는 DB 없이 돈다.
                    saved.append({
                        "profile": s["profile"]["id"],
                        "profile_desc": s["profile"]["desc"],
                        "pblanc_id": s["pblanc_id"],
                        "title": title,
                        "status": s["status"],
                        "why": s["why"],
                        "run": n,
                        "text": r.text,
                        "state": recommend.build_state(
                            hit, recommend.format_profile(
                                address=u["address"], industry_name=industry,
                                std_excluded=excluded,
                                employee_count=u["employee_count"],
                                open_date=_date(u.get("open_date")),
                                annual_revenue=u.get("annual_revenue"),
                                birth_date=_date(u.get("birth_date")),
                                is_prestartup=u.get("is_prestartup", False))),
                        "prompt_tokens": r.prompt_tokens,
                        "completion_tokens": r.completion_tokens,
                    })
    finally:
        await db.close_pool()

    if saved:
        OUT.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%m%d_%H%M")
        path = OUT / f"run_{stamp}_c{search.EXPLAIN_CHUNKS}.json"
        path.write_text(json.dumps({
            "chunks": search.EXPLAIN_CHUNKS,
            "lead": search.LEAD_CHUNKS,
            "model": explain_mod.gms.DEFAULT_MODEL,
            "rules": explain_mod.RULES,
            "goal": explain_mod.GOAL,
            "items": saved,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n저장 {len(saved)}건 → {path}")

    if not args.dry and done:
        tot = tot_in + tot_out
        cr = (tot_in * explain_mod.CREDITS_IN_PER_1K
              + tot_out * explain_mod.CREDITS_OUT_PER_1K) / 1000
        print(f"\n{'=' * 72}")
        print(f"성공 {done}/{len(sel)}건")
        print(f"합계 {tot:,}토큰 (입력 {tot_in:,} / 출력 {tot_out:,})  {cr:.1f}크레딧")
        print(f"건당 평균 {tot // done:,}토큰  {cr / done:.1f}크레딧")


if __name__ == "__main__":
    asyncio.run(main())
