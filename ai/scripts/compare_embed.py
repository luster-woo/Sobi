"""KoE5 vs KURE-v1 비교. 모델당 1회 실행 (메모리 5GB 동시 점유 방지).

  python scripts/compare_embed.py koe5
  python scripts/compare_embed.py kure
"""
import json, re, sys, time
from pathlib import Path

import numpy as np
import psutil
from sentence_transformers import SentenceTransformer

MODELS = {
    "koe5": ("nlpai-lab/KoE5", "query: ", "passage: "),
    "kure": ("nlpai-lab/KURE-v1", "", ""),   # BGE-m3 계열은 프리픽스 없음
}
NATIONWIDE = {  # README 7번: Recall 부풀리는 전국 사업
    "PBLN_000000000123334", "PBLN_000000000122273", "PBLN_000000000125880",
}
ROOT = Path(__file__).resolve().parents[1]
TAG = re.compile(r"<[^>]+>")


def clean(html: str) -> str:
    t = TAG.sub(" ", html or "").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", t).strip()


def is_target(it):
    title = it.get("pblancNm", "")
    return (it.get("trgetNm") == "소상공인" or "소상공인" in title or "소공인" in title) \
        and (it.get("printFlpthNm") or it.get("flpthNm"))


def profile_query(p):
    u = p["user"]
    months = 0  # desc에 업력이 이미 들어있어 desc를 그대로 쓴다
    return f"{p['desc']} 사업자에게 맞는 정부 지원사업"


key = sys.argv[1]
name, q_prefix, p_prefix = MODELS[key]

items = json.loads((ROOT / "data/raw/bizinfo_all.json").read_text(encoding="utf-8"))
corpus = list({it["pblancId"]: it for it in items if is_target(it)}.values())
ids = [it["pblancId"] for it in corpus]
passages = [f"{it.get('pblancNm','')}\n{clean(it.get('bsnsSumryCn',''))}" for it in corpus]

golden = json.loads((ROOT / "data/eval/golden_set.json").read_text(encoding="utf-8"))
profiles = golden["profiles"]
queries = [profile_query(p) for p in profiles]

proc = psutil.Process()
mem0 = proc.memory_info().rss / 1e9
t = time.time()
model = SentenceTransformer(name, device="cpu")
model.max_seq_length = 512
load_s, mem = time.time() - t, proc.memory_info().rss / 1e9 - mem0

t = time.time()
P = model.encode([p_prefix + p for p in passages], batch_size=8,
                 normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=True)
enc_s = time.time() - t

t = time.time()
Q = model.encode([q_prefix + q for q in queries], batch_size=8,
                 normalize_embeddings=True, convert_to_numpy=True)
q_ms = (time.time() - t) / len(queries) * 1000

sim = Q @ P.T
rank = np.argsort(-sim, axis=1)

print(f"\n=== {name} ===")
print(f"로드 {load_s:.1f}s / 메모리 +{mem:.2f}GB / dim {P.shape[1]} "
      f"/ passage {len(passages)}건 {enc_s:.1f}s / query 평균 {q_ms:.0f}ms")

for k in (10, 30):
    hits = tot = 0
    lines = []
    for i, p in enumerate(profiles):
        exp = {e["pblancId"] for e in p["expected"]} - NATIONWIDE
        if not exp:
            continue
        top = {ids[j] for j in rank[i][:k]}
        h = len(exp & top)
        hits += h
        tot += len(exp)
        lines.append(f"  {p['id']} {h}/{len(exp)}")
    print(f"\nRecall@{k} (전국 제외) = {hits}/{tot} = {hits/tot:.3f}")
    if k == 10:
        print("\n".join(lines))