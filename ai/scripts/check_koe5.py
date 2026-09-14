import os, time, psutil
from pathlib import Path
os.environ.setdefault("HF_HOME", str(Path(__file__).resolve().parents[1] / "models"))  # ai/models (gitignore됨)
from sentence_transformers import SentenceTransformer

proc = psutil.Process()
mem0 = proc.memory_info().rss / 1e9
t = time.time()
model = SentenceTransformer("nlpai-lab/KoE5", device="cpu")
print(f"[로드] {time.time()-t:.1f}s, 메모리 +{proc.memory_info().rss/1e9-mem0:.2f}GB, "
      f"max_seq={model.max_seq_length}, dim={model.get_sentence_embedding_dimension()}")

query = "query: 부산 소재 업력 2년 요식업 소상공인, 시설 자금 필요"
passages = [
    "passage: 부산광역시 소재 소상공인 대상 점포 시설 개선 비용 최대 500만원 지원",
    "passage: 서울시 청년 창업자 대상 온라인 마케팅 교육 프로그램 참가자 모집",
    "passage: 경남 제조업 중소기업 스마트공장 구축 지원사업 공고",
]
q = model.encode(query, normalize_embeddings=True)
p = model.encode(passages, normalize_embeddings=True)
print("[유사도]")
for s, txt in sorted(zip(p @ q, passages), reverse=True):
    print(f"  {s:.3f}  {txt[9:45]}")

t = time.time(); model.encode(query, normalize_embeddings=True)
print(f"[질의 1개] {(time.time()-t)*1000:.0f}ms")
for n in (10, 50):
    batch = ["passage: " + "소상공인 지원사업 공고 신청자격 및 지원내용 " * 25] * n  # 약 400토큰
    t = time.time(); model.encode(batch, batch_size=16, normalize_embeddings=True)
    print(f"[passage {n}개] {time.time()-t:.1f}s")