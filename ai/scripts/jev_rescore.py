"""저장된 예측을 임계값별로 다시 채점한다. API 호출 없음.

    python scripts/jev_rescore.py                 # pred_C.json
    python scripts/jev_rescore.py pred_A.json
    python scripts/jev_rescore.py --detail 0.4    # 그 tau 의 오판 상세
"""

import argparse
import json
from collections import Counter
from pathlib import Path

LENIENT = {("eligible", "unknown"), ("ineligible", "unknown")}
TAUS = (0.0, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5)
FACTS = (0.45, 0.5, 0.52, 0.54, 0.56, 0.62, 1.0)


def gate(v: dict, tau: float, fact: float = 0.52, certain: float = 0.99) -> str:
    """app/rag/jev.py 의 gate() 와 같은 논리. 임계값만 훑을 수 있게 인자로 뺐다.

    운영 기본값(fact 0.52 / tau 0.35 / certain 0.99)으로 부르면 결과가 같아야 한다.
    fact >= 1.0 은 사실 게이트를 끈다는 뜻이다.
    """
    if fact < 1.0 and v.get("prestartup") and v.get("needs_registered", 0) > fact:
        return "ineligible"
    if v["choice"] == "ineligible" and v["conf"] >= certain:
        return "ineligible"
    if fact < 1.0 and (v["needs_status"] > fact or v["needs_person"] > fact):
        return "unknown"
    return "unknown" if v["conf"] < tau else v["choice"]


def tally(preds: dict, tau: float, fact: float = 0.56) -> dict:
    strict = lenient = serious = 0
    decided = decided_ok = risky = 0
    for v in preds.values():
        g, f = v["gold"], gate(v, tau, fact)
        if g == f:
            strict += 1
        elif (g, f) in LENIENT:
            lenient += 1
        else:
            serious += 1
        if f != "unknown":
            decided += 1
            decided_ok += g == f
            risky += g == "unknown"
    return {"strict": strict, "lenient": lenient, "serious": serious,
            "decided": decided, "decided_ok": decided_ok, "risky": risky}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", default="pred_C.json")
    ap.add_argument("--detail", type=float, default=None)
    ap.add_argument("--fact", type=float, default=0.52, help="--detail 에 쓸 사실 임계값")
    args = ap.parse_args()

    data = json.loads((Path(__file__).resolve().parents[1] / "data/eval/jev_runs" / args.file).read_text(encoding="utf-8"))
    preds = data["preds"]
    n = len(preds)
    print(f"{args.file}  모델 {data['model']}  입력 {data['variant']}  {n}쌍\n")
    print(f"{'tau':>5} {'엄격':>7} {'완화':>7} {'심각':>5} "
          f"{'coverage':>9} {'확정신뢰도':>11} {'위험':>5}")
    for tau in TAUS:
        t = tally(preds, tau)
        cov = t["decided"] / n
        rel = t["decided_ok"] / t["decided"] if t["decided"] else 0
        print(f"{tau:>5.2f} {t['strict']/n:>7.3f} "
              f"{(t['strict']+t['lenient'])/n:>7.3f} {t['serious']:>5} "
              f"{cov:>9.3f} {rel:>11.3f} {t['risky']:>5}")

    t = tally(preds, 0.0, fact=1.0)
    cov = t["decided"] / n
    rel = t["decided_ok"] / t["decided"] if t["decided"] else 0
    print(f"{'게이트끔':>5} {t['strict']/n:>7.3f} "
          f"{(t['strict']+t['lenient'])/n:>7.3f} {t['serious']:>5} "
          f"{cov:>9.3f} {rel:>11.3f} {t['risky']:>5}")

    # 사실 게이트 임계값 × tau 2차원 스윕
    for label, key in (("엄격", lambda t: f"{t['strict']/n:>9.3f}"),
                       ("심각", lambda t: f"{t['serious']:>9}"),
                       ("위험", lambda t: f"{t['risky']:>9}")):
        print(f"\n[{label}]{'':>2}" + "".join(f"{x:>9.2f}" for x in TAUS) + "   ← tau")
        for fact in FACTS:
            lab = "게이트끔" if fact >= 1.0 else f"사실{fact:.2f}"
            print(f"{lab:>8}" + "".join(key(tally(preds, tau, fact)) for tau in TAUS))

    # 개발/검증 분할. 임계값을 고른 데이터에서 잰 성능은 과대평가된다(11-3)
    keys = sorted(preds)
    dev = {k: preds[k] for i, k in enumerate(keys) if i % 2 == 0}
    hold = {k: preds[k] for i, k in enumerate(keys) if i % 2 == 1}
    print(f"\n[개발 {len(dev)} / 검증 {len(hold)}]  사실0.56 tau0.40 기준")
    for name, sub in (("개발", dev), ("검증", hold), ("전체", preds)):
        m, s = len(sub), tally(sub, 0.40, 0.56)
        rel = s["decided_ok"] / s["decided"] if s["decided"] else 0
        print(f"  {name} 엄격 {s['strict']}/{m} = {s['strict']/m:.3f}"
              f"  완화 {(s['strict']+s['lenient'])/m:.3f}"
              f"  심각 {s['serious']}  확정신뢰도 {rel:.3f}  위험 {s['risky']}")
    print("  ※ 전국 사업 6건이 양쪽에 걸쳐 있어 완전한 분리는 아니다")

    if args.detail is None:
        return

    print(f"\n── tau {args.detail} / 사실 {args.fact} 오판 상세 ──")
    for k, v in preds.items():
        g, f = v["gold"], gate(v, args.detail, args.fact)
        if g == f:
            continue
        kind = "보수적" if (g, f) in LENIENT else "심각 "
        print(f"{kind} {k:<14} {g}→{f}  conf {v['conf']:.2f}  "
              f"지위 {v['needs_status']:.2f} 신상 {v['needs_person']:.2f} "
              f"택일 {v['either']:.2f}\n       {v['title']}")


if __name__ == "__main__":
    main()
