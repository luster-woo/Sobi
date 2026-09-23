"""골든셋을 GMS(gpt-4.1-mini)로 판정하고 채점한다. jev_run.py 의 대조군.

문서가 미뤄둔 질문 하나를 닫기 위한 스크립트다.

    "Jev 가 더 정확한 게 아니라, Jev 라서 원문을 넣는 것이 가능해졌다"

이 주장은 A 비교(둘 다 원문 없이 동률) 하나에 기대고 있었다. GMS 에 원문을
줬을 때 어떻게 되는지는 재보지 않았기 때문이다. 이 스크립트가 그것을 잰다.

입력·게이트·채점을 jev_run.py 에서 그대로 가져온다. 바뀌는 것은 모델뿐이다.

**확신도 게이트는 끈다(tau=0).** LLM 이 말하는 confidence 는 계산값이 아니라
생성된 문자열이라 Jev 의 confidence 와 같은 것이 아니다. 사실 게이트 넷만
동일하게 태운다. 이 차이는 결과를 읽을 때 감안해야 한다.

**비용이 든다.** 1K 토큰 ≈ 3크레딧(실측). 85쌍 전체가 약 33만 토큰 = 약
1,000크레딧이다. 먼저 --limit 10 으로 확인하고 전체를 돌릴 것.

    python scripts/gms_run.py --limit 10      # 약 120크레딧
    python scripts/gms_run.py --yes           # 전체, 약 1,000크레딧

결과는 data/eval/jev_runs/pred_gms_*.json. 근거는 docs/07_jev_judgement.md.
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

AI = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI))

load_dotenv()

from app.core import gms  # noqa: E402
from app.rag.jev import gate  # noqa: E402
from app.rag.llm_judge import MAX_OUTPUT, SYSTEM_PROMPT, _num  # noqa: E402
from scripts.jev_run import PACK, OUT, build_state, score, sweep  # noqa: E402

BATCH_SIZE = 5
CREDITS_PER_1K = 3      # 실측: 19,400토큰 호출 1건 = 60크레딧


async def ask(batch: list[tuple[int, str]]) -> dict[int, dict]:
    """(인덱스, state) 묶음 하나를 GMS 에 던진다.

    program_id 대신 인덱스를 쓴다. 골든셋은 한 공고가 여러 프로필에 걸리므로
    program_id 는 고유하지 않다.
    """
    user = "\n\n".join(f"## program_id: {i}\n{s}" for i, s in batch)
    try:
        r = await gms.get_client().chat.completions.create(
            model=gms.DEFAULT_MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            max_completion_tokens=MAX_OUTPUT,
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                      {"role": "user", "content": user}],
        )
        if r.choices[0].finish_reason == "length":
            print(f"\n  ! 응답 잘림 (배치 {[i for i, _ in batch]})")
        rows = json.loads(r.choices[0].message.content).get("results", [])
    except Exception as e:
        print(f"\n  ! 호출 실패 {[i for i, _ in batch]}: {e}")
        return {}
    return {v["program_id"]: v for v in rows
            if isinstance(v, dict) and "program_id" in v}


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default="C", choices=["A", "B", "C"])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--yes", action="store_true", help="전체 실행 확인")
    args = ap.parse_args()

    pack = json.loads(PACK.read_text(encoding="utf-8"))
    pairs = pack["pairs"][:args.limit] if args.limit else pack["pairs"]

    states = [(i, build_state(pack, p, args.variant)) for i, p in enumerate(pairs)]
    chars = sum(len(s) for _, s in states)
    tokens = int(chars / 1.4)
    credits = tokens / 1000 * CREDITS_PER_1K
    calls = -(-len(states) // BATCH_SIZE)
    print(f"{len(pairs)}쌍 / {calls}콜 / 약 {tokens:,}토큰 "
          f"→ 약 {credits:.0f}크레딧")
    if not args.limit and not args.yes:
        raise SystemExit("전체 실행은 --yes 가 필요합니다.")

    batches = [states[i:i + BATCH_SIZE] for i in range(0, len(states), BATCH_SIZE)]
    t0 = time.perf_counter()
    parsed: dict[int, dict] = {}
    for part in await asyncio.gather(*(ask(b) for b in batches)):
        parsed |= part
    sec = time.perf_counter() - t0

    preds = {}
    missing = 0
    for i, pair in enumerate(pairs):
        key = f"{pair['profile']}|{pair['program'][-6:]}"
        v = parsed.get(i)
        if v is None:
            missing += 1
            continue
        choice = v.get("status")
        rec = {
            "gold": pair["gold"],
            "choice": choice if choice in ("eligible", "ineligible") else "ineligible",
            "conf": 0.5,          # 게이트를 타지 않는 값. tau=0 과 짝이다
            "needs_status": _num(v.get("needs_status")),
            "needs_person": _num(v.get("needs_person")),
            "needs_registered": _num(v.get("needs_registered")),
            "either": _num(v.get("either")),
            "prestartup": pair.get("prestartup", False),
            "title": pack["programs"][pair["program"]]["name"][:48],
        }
        rec["final"] = gate(rec, prestartup=rec["prestartup"], tau=0.0)
        preds[key] = rec

    if missing:
        print(f"\n응답 누락 {missing}쌍 — 채점에서 빠졌다")

    out = OUT / f"pred_gms_{args.variant}.json"
    out.write_text(json.dumps({"model": gms.DEFAULT_MODEL, "variant": args.variant,
                               "tau": 0.0, "preds": preds},
                              ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n모델 {gms.DEFAULT_MODEL} / 입력 {args.variant} / "
          f"{len(preds)}쌍 / {sec:.1f}초")
    score(preds)
    sweep(preds)
    print(f"\n→ {out}")


if __name__ == "__main__":
    asyncio.run(main())
