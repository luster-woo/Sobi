"""골든셋 평가. Recall@k와 LLM 판정 정확도를 잰다.

    python scripts/eval_golden.py                            # 검색만
    python scripts/eval_golden.py --llm                      # LLM 검증까지 (GMS 비용 발생)
    python scripts/eval_golden.py --llm --model gpt-5.4-mini # 판정 모델 지정
"""

import argparse
import asyncio
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.core import db
from app.rag import recommend as rag_recommend
from app.rag import search as rag_search

ROOT = Path(__file__).resolve().parents[1]

# data/eval/README.md 7번: 대부분 프로필의 expected에 공통으로 들어가 Recall을 부풀린다.
NATIONWIDE = {
    "PBLN_000000000123334", "PBLN_000000000122273", "PBLN_000000000125880",
}
KS = (10, 30)
NOT_FOUND = 9999


def _user_of(profile: dict) -> dict:
    """골든셋의 user를 날짜 타입으로 변환한다."""
    user = dict(profile["user"])
    user["open_date"] = date.fromisoformat(user["open_date"])
    if user.get("birth_date"):
        user["birth_date"] = date.fromisoformat(user["birth_date"])
    return user


async def evaluate(profiles: list[dict], use_llm: bool, model: str | None) -> None:
    await db.open_pool()

    recall = {k: [0, 0] for k in KS}          # k → [적중, 전체]
    recall_all = {k: [0, 0] for k in KS}      # 전국 사업 포함
    rows = []
    rank_lines = []
    all_ranks = []

    for p in profiles:
        user = _user_of(p)
        # 검색은 연령을 쓰지 않는다. 판정에서만 쓴다.
        search_args = {k: v for k, v in user.items() if k != "birth_date"}
        result = await rag_search.search(**search_args)

        ranked = [h.pblanc_id for h in result.hits]
        rank_of = {pid: i + 1 for i, pid in enumerate(ranked)}

        exp_all = {e["pblancId"] for e in p["expected"]}
        exp = exp_all - NATIONWIDE
        line = {"id": p["id"], "found": len(ranked)}

        for k in KS:
            top = set(ranked[:k])
            if exp:
                recall[k][0] += len(exp & top)
                recall[k][1] += len(exp)
            recall_all[k][0] += len(exp_all & top)
            recall_all[k][1] += len(exp_all)
            line[f"@{k}"] = f"{len(exp & top)}/{len(exp)}" if exp else "-"

        rows.append(line)

        if exp:
            ranks = sorted(rank_of.get(e, NOT_FOUND) for e in exp)
            all_ranks.extend(ranks)
            shown = ", ".join(str(r) if r < NOT_FOUND else "없음" for r in ranks)
            rank_lines.append(f"  {p['id']}  후보 {len(ranked):>3}건 중 정답 순위: {shown}")

    print(f"{'프로필':<6} {'검색':>4} {'@10':>7} {'@30':>7}")
    for r in rows:
        print(f"{r['id']:<6} {r['found']:>4} {r['@10']:>7} {r['@30']:>7}")

    print()
    for k in KS:
        hit, tot = recall[k]
        hit_a, tot_a = recall_all[k]
        print(f"Recall@{k}  전국제외 {hit}/{tot} = {hit / tot:.3f}"
              f"   전체 {hit_a}/{tot_a} = {hit_a / tot_a:.3f}")

    print("\n정답 공고 순위 (전국 사업 제외)")
    for line in rank_lines:
        print(line)

    found = [r for r in all_ranks if r < NOT_FOUND]
    if found:
        found.sort()
        mid = found[len(found) // 2]
        print(f"\n순위 분포  중앙값 {mid}위 / 최고 {found[0]}위 / 최저 {found[-1]}위"
              f" / 미검출 {len(all_ranks) - len(found)}건")
        buckets = [(1, 10), (11, 30), (31, 60), (61, 100), (101, 9998)]
        for lo, hi in buckets:
            n = sum(1 for r in found if lo <= r <= hi)
            label = f"{lo}~{hi}위" if hi < 9998 else f"{lo}위 이하"
            print(f"  {label:>10} {'#' * n} {n}")

    if use_llm:
        await evaluate_llm(profiles, model)

    await db.close_pool()


async def evaluate_llm(profiles: list[dict], model: str | None) -> None:
    """검색된 공고 중 골든셋에 라벨이 있는 것만 판정 정확도를 본다."""
    correct = total = 0
    confusion: dict[tuple[str, str], int] = {}
    mistakes: list[str] = []
    kwargs = {"model": model} if model else {}

    for p in profiles:
        print(f"  {p['id']} 판정 중...", flush=True)
        user = _user_of(p)

        truth = {e["pblancId"]: "eligible" for e in p["expected"]}
        truth |= {h["pblancId"]: h["label"] for h in p["hard_negatives"]}

        out = await rag_recommend.recommend(**user, include_rejected=False, **kwargs)
        for r in out["results"]:
            gold = truth.get(r["pblanc_id"])
            if gold is None:
                continue  # 골든셋에 없는 공고는 정답을 모른다
            total += 1
            correct += gold == r["status"]
            key = (gold, r["status"])
            confusion[key] = confusion.get(key, 0) + 1
            if gold != r["status"]:
                mistakes.append(
                    f"  {p['id']} {r['pblanc_id'][-6:]} {gold}→{r['status']}\n"
                    f"      공고: {r['title'][:50]}\n"
                    f"      사유: {r['reason'][:150]}"
                )

    if not total:
        print("\n판정 대상 없음")
        return

    print(f"\nLLM 판정 정확도 {correct}/{total} = {correct / total:.3f}")
    for (gold, pred), n in sorted(confusion.items()):
        mark = "  " if gold == pred else "X "
        print(f"  {mark}{gold:>11} → {pred:<11} {n}")

    if mistakes:
        print("\n오판 상세")
        print("\n".join(mistakes))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--llm", action="store_true", help="LLM 검증 정확도까지 측정")
    ap.add_argument("--model", default=None, help="판정 모델 (기본: gms.DEFAULT_MODEL)")
    args = ap.parse_args()

    golden = json.loads((ROOT / "data/eval/golden_set.json").read_text(encoding="utf-8"))
    asyncio.run(evaluate(golden["profiles"], args.llm, args.model))


if __name__ == "__main__":
    main()