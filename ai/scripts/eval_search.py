"""자연어 검색 품질을 잰다. /rag/search-text 와 같은 경로를 태운다.

    python -m scripts.eval_search
    python -m scripts.eval_search --k 5        # 상위 몇 건까지 볼지
    python -m scripts.eval_search --detail     # 질의별 결과 나열

평가셋은 data/eval/search_set.json. 지표를 두 가지로 나눠 쓴다.

**협의 질의** — 정답이 1~3건이다. Recall@k 를 쓴다. "그 공고를 찾아내는가".
**광의 질의** — 정답이 8~25건이다. Recall 은 구조적으로 1.0 에 닿지 못하므로
(정답이 25건인데 k가 10이면 최대 0.4) Precision@k 를 쓴다. "상위 k건이
의도에 맞는가". 어느 지자체 건이 올라오든 상관없다.

하나로 뭉치면 숫자가 거짓말을 한다. 나눠 두면 진단에도 쓸모가 있다.
Recall 이 낮으면 임베딩 문제, Precision 이 낮으면 컷오프 문제다.

`must` 는 질의 의도에 정확히 부합하는 공고, `ok` 는 나와도 틀리지 않는 공고다.
Recall 은 `must` 로만 계산하고, Precision 은 `must ∪ ok` 를 맞은 것으로 센다.

안내문서(`advisory`)는 신청 대상이 없어 사용자에게 쓸모가 없다. 상위에
올라오면 오답으로 센다.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # 파일로 리다이렉트하면 콘솔 인코딩(cp949)을 쓴다. 한글이 깨진다.
    sys.stdout.reconfigure(encoding="utf-8")

from app.core import db
from app.rag import lexical
from app.rag import search as rag_search

ROOT = Path(__file__).resolve().parents[1]
SET = ROOT / "data/eval/search_set.json"
TSV = ROOT / "data/eval/programs.tsv"


def load_titles() -> dict[str, str]:
    """pblanc_id 뒤 6자리 → 제목. export_programs.py 가 만든다."""
    if not TSV.exists():
        return {}
    out = {}
    for line in TSV.read_text(encoding="utf-8").split("\n")[1:]:
        if line.strip():
            c = line.split("\t")
            out[c[0]] = c[6]
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=10)
    ap.add_argument("--top-k", type=int, default=30, help="검색에 요청할 개수")
    ap.add_argument("--detail", action="store_true")
    ap.add_argument("--only", default=None, help="질의에 이 문자열이 든 것만")
    ap.add_argument("--rerank", action="store_true",
                    help="Jev 재정렬을 켠다. 질의당 후보 수만큼 호출한다")
    ap.add_argument("--margin", type=float, default=None,
                    help="DISTANCE_MARGIN 을 이 값으로 바꿔 잰다")
    ap.add_argument("--max-distance", type=float, default=None,
                    help="MAX_DISTANCE 를 이 값으로 바꿔 잰다")
    ap.add_argument("--hybrid", action="store_true",
                    help="어휘 검색(BM25)을 섞는다")
    ap.add_argument("--tokenizer", choices=["kiwi", "bigram"], default=None,
                    help="어휘 검색 토큰화 방식")
    ap.add_argument("--engine", choices=["builtin", "rank_bm25"], default=None,
                    help="BM25 점수 계산 구현")
    ap.add_argument("--fusion", choices=["append", "rrf"], default=None,
                    help="벡터와 어휘를 합치는 방식")
    ap.add_argument("--lex-min", type=float, default=None,
                    help="어휘 후보로 칠 최소 점수")
    ap.add_argument("--lex-only-min", type=float, default=None,
                    help="벡터가 빈손일 때의 어휘 문턱")
    ap.add_argument("--rerank-min", type=float, default=None,
                    help="재정렬 점수가 이보다 낮으면 버린다 (0~3)")
    ap.add_argument("--repeat", type=int, default=1,
                    help="반복 측정. 재정렬 점수는 실행마다 흔들린다")
    args = ap.parse_args()

    # 상수를 바꿔가며 재려면 모듈 값을 갈아끼운다. 운영 코드는 그대로 둔다.
    if args.margin is not None:
        rag_search.DISTANCE_MARGIN = args.margin
    if args.max_distance is not None:
        rag_search.MAX_DISTANCE = args.max_distance
    if args.lex_min is not None:
        rag_search.LEX_MIN = args.lex_min
    if args.lex_only_min is not None:
        rag_search.LEX_ONLY_MIN = args.lex_only_min
    if args.rerank_min is not None:
        rag_search.RERANK_MIN = args.rerank_min
    if args.tokenizer:
        lexical.TOKENIZER = args.tokenizer
    if args.engine:
        lexical.ENGINE = args.engine
    if args.fusion:
        rag_search.FUSION = args.fusion
    lex_desc = (f"{lexical.ENGINE}/{lexical.TOKENIZER}/{rag_search.FUSION} "
                f"min{rag_search.LEX_MIN}/only{rag_search.LEX_ONLY_MIN}"
                ) if args.hybrid else "끔"
    print(f"컷오프  margin {rag_search.DISTANCE_MARGIN}  "
          f"max {rag_search.MAX_DISTANCE}  k {args.k}  "
          f"재정렬 {f'켬 min{rag_search.RERANK_MIN}' if args.rerank else '끔'}  "
          f"어휘 {lex_desc}")

    data = json.loads(SET.read_text(encoding="utf-8"))
    if args.rerank:
        n = sum(1 for _ in data["queries"])
        print(f"재정렬 켜짐 — 질의 {n}개, 후보당 Jev 1콜")
    advisory = set(data.get("advisory", []))
    titles = load_titles()

    await db.open_pool()
    try:
        if args.hybrid:
            await lexical.build(rag_search.ADVISORY)

        # program_id → pblanc_id 매핑. search_by_text 는 program_id 만 준다.
        async with db.acquire() as conn:
            cur = await conn.execute("SELECT id, pblanc_id FROM support_program")
            pid2pb = {r["id"]: r["pblanc_id"][-6:] for r in await cur.fetchall()}

        rows = []
        for q in data["queries"]:
            hits = await rag_search.search_by_text(
                query=q["query"], top_k=args.top_k,
                rerank=args.rerank, hybrid=args.hybrid)
            ranked = [pid2pb.get(h["program_id"], "?") for h in hits]
            top = ranked[:args.k]
            must, ok = set(q["must"]), set(q["ok"])

            if q["type"] == "negative":
                # 지원사업과 무관한 질의. 아무것도 안 나오는 것이 정답이다.
                score = 1.0 if not ranked else 0.0
                missed = []
            elif q["type"] == "narrow":
                found = must & set(top)
                score = len(found) / len(must)
                missed = sorted(must - set(top))
            else:
                hit = [p for p in top if p in must or p in ok]
                score = len(hit) / len(top) if top else 0.0
                missed = []

            rows.append({
                "q": q, "ranked": ranked, "top": top, "score": score,
                "missed": missed,
                "adv": [p for p in top if p in advisory],
                "returned": len(ranked),
            })
    finally:
        await db.close_pool()

    def rank_of(r, pb):
        return r["ranked"].index(pb) + 1 if pb in r["ranked"] else None

    def avg(sel):
        return sum(r["score"] for r in sel) / len(sel) if sel else 0.0

    for kind, label, metric in (("narrow", "협의", f"Recall@{args.k}"),
                                ("broad", "광의", f"Precision@{args.k}"),
                                ("negative", "무관", "0건이면 정답")):
        sel = [r for r in rows if r["q"]["type"] == kind]
        if not sel:
            continue
        print(f"\n{'=' * 72}\n{label} 질의 {len(sel)}개 — {metric}\n")
        for r in sel:
            mark = "  " if r["score"] >= 0.999 else ("~ " if r["score"] > 0 else "X ")
            og = "본문" if r["q"].get("origin") == "body" else "제목"
            print(f"{mark}{r['score']:.2f} [{og}] 검색 {r['returned']:>2}건  {r['q']['query']}")
            if kind == "negative" and r["ranked"]:
                for pb in r["top"][:3]:
                    print(f"        샜음 {pb}  {titles.get(pb, '')[:44]}")
            if r["missed"]:
                for pb in r["missed"]:
                    rk = rank_of(r, pb)
                    where = f"{rk}위" if rk else f"{args.top_k}위 밖"
                    print(f"        놓침 {pb} ({where})  {titles.get(pb, '')[:44]}")
            if r["adv"]:
                print(f"        안내문서 {r['adv']}")
        parts = []
        for og, name in (("title", "제목"), ("body", "본문"), ("keyword", "키워드")):
            g = [r for r in sel if r["q"].get("origin", "title") == og]
            if g:
                parts.append(f"{name} {len(g)}개 {avg(g):.3f}")
        print(f"\n  {metric} 평균 {avg(sel):.3f}   (" + " / ".join(parts) + ")")

    print(f"\n{'=' * 72}")
    # 제목을 보고 쓴 질의는 검색에 유리하다. 표현별 격차가 편향의 크기다.
    for kind, label in (("narrow", "협의"), ("broad", "광의")):
        g = {og: [r for r in rows if r["q"]["type"] == kind
                  and r["q"].get("origin", "title") == og]
             for og in ("title", "body", "keyword")}
        if all(g.values()):
            print(f"{label}  제목 {avg(g['title']):.3f}  본문 {avg(g['body']):.3f}  "
                  f"키워드 {avg(g['keyword']):.3f}")

    # 키워드 질의는 같은 정답 집합에 문장만 바꾼 것이다. 직접 대조가 된다.
    src = {r["q"]["query"]: r for r in rows}
    kw = [r for r in rows if r["q"].get("origin") == "keyword" and r["q"].get("from")]
    drop = [(r, src[r["q"]["from"]]) for r in kw if r["q"]["from"] in src]
    if drop:
        worse = [(k, o) for k, o in drop if k["score"] < o["score"] - 1e-9]
        print(f"\n같은 정답에 표현만 바꾼 쌍 {len(drop)}개 — "
              f"키워드가 더 나쁜 것 {len(worse)}개")
        for k, o in sorted(worse, key=lambda x: x[0]["score"] - x[1]["score"])[:8]:
            print(f"  {o['score']:.2f} → {k['score']:.2f}  "
                  f"\"{o['q']['query'][:26]}\" → \"{k['q']['query']}\"")
    adv_q = [r for r in rows if r["adv"]]
    print(f"안내문서가 상위 {args.k}에 낀 질의 {len(adv_q)}/{len(rows)}")
    empty = [r for r in rows if r["returned"] == 0]
    if empty:
        print(f"결과 0건 질의 {len(empty)}: {[r['q']['query'] for r in empty]}")
    short = [r for r in rows if 0 < r["returned"] < args.k]
    if short:
        print(f"{args.k}건 미만 반환 {len(short)}건 — 컷오프가 자르고 있다")

    if args.detail:
        print(f"\n{'=' * 72}\n질의별 상위 {args.k}\n")
        for r in rows:
            if args.only and args.only not in r["q"]["query"]:
                continue
            print(f"■ {r['q']['query']}")
            for i, pb in enumerate(r["top"], 1):
                tag = ("must" if pb in r["q"]["must"]
                       else "ok" if pb in r["q"]["ok"]
                       else "안내" if pb in advisory else "  · ")
                print(f"   {i:>2} [{tag:>4}] {pb} {titles.get(pb, '')[:50]}")
            print()


if __name__ == "__main__":
    asyncio.run(main())
