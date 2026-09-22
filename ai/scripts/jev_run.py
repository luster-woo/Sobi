"""골든셋을 Jev 로 판정하고 채점한다. DB 불필요.

    python scripts/export_judge_input.py      # 입력 만들기 (DB 필요, 크레딧 0원)
    python scripts/jev_run.py                 # C = 조건+원문 (확정 구성)
    python scripts/jev_run.py --variant A     # A = 조건만 (개선 전 대조군)
    python scripts/jev_run.py --repeat 10     # 견고성 → jev_stability.py
    python scripts/jev_rescore.py             # 임계값 스윕 (API 호출 없음)

결과는 data/eval/jev_runs/ 에 쌓인다. 측정 근거는 docs/07_jev_judgement.md.
.env 에 TYPESAFE_API_KEY 가 있어야 한다.
"""

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from typesafe_sdk import Noul

AI = Path(__file__).resolve().parents[1]            # .../S15P21D101/ai
sys.path.insert(0, str(AI))

load_dotenv()

# 질문 정의와 게이트는 운영 코드에서 가져온다. 갈라지면 측정이 운영을 대변하지 못한다.
from app.rag.jev import FACT, QUESTIONS, TAU, gate, get_client  # noqa: E402

PACK = AI / "data/eval/judge_pack.json"
OUT = AI / "data/eval/jev_runs"
OUT.mkdir(exist_ok=True)

# 보수적 오판. 판정을 미뤘을 뿐이라 사용자에게 잘못된 결론을 주지 않는다.
LENIENT = {("eligible", "unknown"), ("ineligible", "unknown")}

def doc_of(pair: dict, prog: dict, k: int | None) -> str:
    """운영과 같은 원문. --chunks 팩이면 상위 k청크를 문서 순서로 잇는다.

    청크 선택이 프로필마다 다르므로 doc 은 공고가 아니라 쌍에 붙는다.
    """
    chunks = pair.get("chunks")
    if chunks and k:
        top = [c for c in chunks if c[0] <= k]
        return "\n".join(c[2] for c in sorted(top, key=lambda c: c[1]))
    return pair.get("doc") or prog["doc"]


def build_state(pack: dict, pair: dict, variant: str, k: int | None = None) -> str:
    prog = pack["programs"][pair["program"]]
    parts = [f"[사업자]\n{pack['profiles'][pair['profile']]}"]
    if variant in ("A", "C"):
        parts.append(f"[공고 조건]\n{prog['conditions']}")
    if variant in ("B", "C"):
        parts.append(f"[공고 원문]\n{doc_of(pair, prog, k)}")
    return "\n\n".join(parts)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default="C", choices=["A", "B", "C"])
    ap.add_argument("--tau", type=float, default=TAU)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--repeat", type=int, default=1, help="반복 실행 후 runs_*.json 저장")
    ap.add_argument("--k", type=int, default=None,
                    help="청크 수. --chunks 팩에서만 쓴다. 생략하면 팩이 만든 그대로")
    args = ap.parse_args()

    if not PACK.exists():
        raise SystemExit(f"입력 파일이 없습니다: {PACK}\n"
                         f"ai 쪽에서 scripts/export_judge_input.py 를 먼저 돌리세요.")

    pack = json.loads(PACK.read_text(encoding="utf-8"))
    pairs = pack["pairs"][:args.limit] if args.limit else pack["pairs"]

    runs, lat, model = [], [], "?"
    client = get_client()
    client.system_one(state="워밍업", questions={"w": Noul(instructions="참인가?")})
    for rep in range(args.repeat):
        preds = {}
        for i, pair in enumerate(pairs, 1):
            key = f"{pair['profile']}|{pair['program'][-6:]}"
            t0 = time.perf_counter()
            r = client.system_one(
                state=build_state(pack, pair, args.variant, args.k),
                questions=QUESTIONS)
            lat.append((time.perf_counter() - t0) * 1000)
            model = r.model
            st = r.choices["status"]
            preds[key] = {
                "gold": pair["gold"],
                "choice": st.choice,
                "conf": round(st.confidence, 3),
                "needs_status": round(r.nouls["needs_status"].noul, 3),
                "needs_person": round(r.nouls["needs_person"].noul, 3),
                "either": round(r.nouls["either"].noul, 3),
                "needs_registered": round(r.nouls["needs_registered"].noul, 3),
                "prestartup": pair.get("prestartup", False),
                "title": pack["programs"][pair["program"]]["name"][:48],
            }
            print(f"\r  {rep + 1}/{args.repeat} 회차  {i}/{len(pairs)}",
                  end="", flush=True)
        for v in preds.values():
            v["final"] = gate(v, prestartup=v["prestartup"], tau=args.tau)
        runs.append(preds)
    print()

    if args.repeat > 1:
        tag = f"{args.variant}" + (f"_k{args.k}" if args.k else "")
        rp = OUT / f"runs_{tag}.json"
        rp.write_text(json.dumps({"model": model, "variant": args.variant,
                                  "tau": args.tau, "fact": FACT, "runs": runs},
                                 ensure_ascii=False), encoding="utf-8")
        print(f"{args.repeat}회 저장 → {rp}\n  분석: python scripts/jev_stability.py")

    preds = runs[-1]
    out = OUT / ("pred_" + args.variant + (f"_k{args.k}" if args.k else "") + ".json")
    out.write_text(json.dumps({"model": model, "variant": args.variant,
                               "tau": args.tau, "preds": preds},
                              ensure_ascii=False, indent=1), encoding="utf-8")

    lat.sort()
    chars = sum(len(build_state(pack, p, args.variant, args.k)) for p in pairs)
    print(f"\n모델 {model} / 입력 {args.variant}"
          + (f" / 청크 {args.k}" if args.k else "")
          + f" / tau {args.tau} / {len(preds)}쌍"
          f" / 중앙 {lat[len(lat)//2]:.0f}ms / 평균 입력 {chars // len(pairs):,}자")
    score(preds)
    sweep(preds)
    print(f"\n→ {out}")


def score(preds: dict) -> None:
    conf = Counter()
    strict = lenient = 0
    serious, soft = [], []
    for k, v in preds.items():
        g, f = v["gold"], v["final"]
        conf[(g, f)] += 1
        if g == f:
            strict += 1
            continue
        line = (f"  {k:<14} {g}→{f}  conf {v['conf']:.2f}  "
                f"지위 {v['needs_status']:.2f} 신상 {v['needs_person']:.2f} "
                f"택일 {v['either']:.2f}\n      {v['title']}")
        if (g, f) in LENIENT:
            lenient += 1
            soft.append(line)
        else:
            serious.append(line)

    n = len(preds)
    print(f"엄격 {strict}/{n} = {strict/n:.3f}   "
          f"완화 {strict+lenient}/{n} = {(strict+lenient)/n:.3f}")
    print("  (비교: gpt-4.1-mini 조건만 = 엄격 0.797 / 완화 0.919)")
    for (g, p), c in sorted(conf.items()):
        mark = "  " if g == p else ("~ " if (g, p) in LENIENT else "X ")
        print(f"  {mark}{g:>11} → {p:<11} {c}")
    if serious:
        print(f"\n심각 오판 {len(serious)}건")
        print("\n".join(serious))
    if soft:
        print(f"\n보수적 오판 {len(soft)}건")
        print("\n".join(soft))


def sweep(preds: dict) -> None:
    n = len(preds)
    raw = sum(v["choice"] == v["gold"] for v in preds.values())
    print(f"\n게이트 없이(2분류 원본) {raw}/{n} = {raw/n:.3f}")
    print("tau 스윕 (지위·신상 게이트 포함)")
    for tau in (0.0, 0.5, 0.6, 0.7, 0.8, 0.9):
        h = sum(gate(v, prestartup=v["prestartup"], tau=tau) == v["gold"]
                for v in preds.values())
        print(f"  tau {tau:.1f} → {h}/{n} = {h/n:.3f}")


if __name__ == "__main__":
    main()
