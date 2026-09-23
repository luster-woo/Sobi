"""반복 실행 결과의 견고성을 본다. API 호출 없음.

    python scripts/jev_run.py --repeat 10      # runs_C.json 생성
    python scripts/jev_stability.py

보는 것
  1. 실행별 점수 분포 — 숫자를 몇째 자리까지 말할 수 있나
  2. 흔들리는 항목 — 실행마다 최종 답이 바뀌는 건
  3. 신호값 표준편차 — conf 와 사실 질문 중 어느 쪽이 안정적인가
  4. 임계값 안정 구간 — 고른 값이 매 실행 안정 구간 안에 있나
"""

import json
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jev_rescore import gate  # 게이트 정의는 한 곳에만 둔다  # noqa: E402

LENIENT = {("eligible", "unknown"), ("ineligible", "unknown")}
SIGNALS = ("conf", "needs_status", "needs_person", "needs_registered", "either")


def tally(preds: dict, tau: float, fact: float) -> tuple[int, int, int]:
    strict = lenient = serious = 0
    for v in preds.values():
        g, f = v["gold"], gate(v, tau, fact)
        if g == f:
            strict += 1
        elif (g, f) in LENIENT:
            lenient += 1
        else:
            serious += 1
    return strict, lenient, serious


def band(preds: dict, tau: float) -> tuple[float, float]:
    """심각 0 을 유지하면서 엄격이 최대인 fact 구간."""
    grid = [round(x * 0.01, 2) for x in range(30, 96)]
    best = max(tally(preds, tau, f)[0] for f in grid
               if tally(preds, tau, f)[2] == 0)
    ok = [f for f in grid
          if tally(preds, tau, f) == (best, tally(preds, tau, f)[1], 0)
          and tally(preds, tau, f)[0] == best]
    return (min(ok), max(ok)) if ok else (0.0, 0.0)


def main() -> None:
    d = json.loads((Path(__file__).resolve().parents[1] / "data/eval/jev_runs/runs_C.json").read_text(encoding="utf-8"))
    runs, tau, fact = d["runs"], d["tau"], d["fact"]
    n = len(runs[0])
    print(f"모델 {d['model']} / 입력 {d['variant']} / {len(runs)}회 × {n}쌍")
    print(f"설정 tau {tau}  fact {fact}\n")

    # 1. 실행별 점수
    rows = [tally(p, tau, fact) for p in runs]
    strict = [s / n for s, _, _ in rows]
    serious = [x for _, _, x in rows]
    lenient = [(s + l) / n for s, l, _ in rows]
    print("회차별  " + "  ".join(f"{s:.3f}" for s in strict))
    print(f"엄격    평균 {st.mean(strict):.3f}  최소 {min(strict):.3f}  "
          f"최대 {max(strict):.3f}  폭 {max(strict) - min(strict):.3f}"
          + (f"  표준편차 {st.stdev(strict):.3f}" if len(strict) > 1 else ""))
    print(f"완화    평균 {st.mean(lenient):.3f}  최소 {min(lenient):.3f}")
    print(f"심각    {Counter(serious).most_common()}  (건수별 회차 수)")

    # 2. 흔들리는 항목
    finals = defaultdict(list)
    for p in runs:
        for k, v in p.items():
            finals[k].append(gate(v, tau, fact))
    flip = {k: Counter(f) for k, f in finals.items() if len(set(f)) > 1}
    print(f"\n최종 답이 흔들린 항목 {len(flip)}/{n}")
    for k, c in sorted(flip.items(), key=lambda x: -len(x[1])):
        gold = runs[0][k]["gold"]
        dist = " ".join(f"{a}×{b}" for a, b in c.most_common())
        ok = sum(v == gold for v in finals[k])
        print(f"  {k:<14} 정답 {gold:<11} {dist:<34} 적중 {ok}/{len(runs)}")
        for s in ("conf", "needs_status", "needs_person"):
            vals = [p[k][s] for p in runs]
            if max(vals) - min(vals) >= 0.05:
                print(f"      {s:<16} {min(vals):.2f}~{max(vals):.2f}")

    # 3. 신호값 표준편차
    print("\n신호값 실행 간 표준편차 (항목별로 구한 뒤 평균)")
    for s in SIGNALS:
        sd = [st.stdev([p[k][s] for p in runs]) for k in runs[0]]
        print(f"  {s:<18} 평균 {st.mean(sd):.3f}  최대 {max(sd):.3f}")

    # 4. 임계값 안정 구간
    print("\n회차별 fact 안정 구간 (심각 0 유지하며 엄격 최대)")
    lo_all, hi_all = [], []
    for i, p in enumerate(runs, 1):
        lo, hi = band(p, tau)
        lo_all.append(lo); hi_all.append(hi)
        mark = "O" if lo <= fact <= hi else "X"
        print(f"  {i:>2}회  {lo:.2f} ~ {hi:.2f}   fact {fact} 포함 {mark}")
    inter_lo, inter_hi = max(lo_all), min(hi_all)
    print(f"\n교집합 {inter_lo:.2f} ~ {inter_hi:.2f}", end="")
    if inter_lo <= inter_hi:
        print(f"  (폭 {inter_hi - inter_lo:.2f}, 중앙 {(inter_lo + inter_hi) / 2:.2f})")
        print(f"  현재 fact {fact} 는 모든 회차의 안정 구간 안에 "
              f"{'있다' if inter_lo <= fact <= inter_hi else '없다'}")
    else:
        print("  — 모든 회차를 만족하는 구간이 없다")


if __name__ == "__main__":
    main()
