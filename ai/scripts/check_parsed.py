"""파싱 결과 점검. 포맷별로 원본 대비 산출물 수·용량·누락을 확인한다."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"

KNOWN_UNPARSABLE = {
    "PBLN_000000000117948",  # 문서 속성 손상, pyhwp 파싱 불가
}

# (라벨, 원본 확장자, 산출물 찾는 함수)
TARGETS = [
    ("pdf ", "*.pdf", lambda pid: ROOT / "data" / "parsed" / pid / "ocr" / f"{pid}.md"),
    ("hwp ", "*.hwp", lambda pid: ROOT / "data" / "parsed_hwp" / f"{pid}.md"),
    ("hwpx", "*.hwpx", lambda pid: ROOT / "data" / "parsed_hwpx" / f"{pid}.md"),
]

total_ok = total_src = 0

for label, pattern, out_path in TARGETS:
    sources = sorted(RAW.glob(pattern))
    missing, empty, sizes = [], [], []

    for src in sources:
        pid = src.stem
        if pid in KNOWN_UNPARSABLE:
            continue
        dest = out_path(pid)
        if not dest.exists():
            missing.append(pid)
            continue
        text = dest.read_text(encoding="utf-8", errors="replace")
        if len(text) < 200:  # 사실상 빈 결과
            empty.append((pid, len(text)))
        sizes.append(len(text))

    done = len(sizes)
    expected = len(sources) - len([s for s in sources if s.stem in KNOWN_UNPARSABLE])
    total_ok += done
    total_src += expected

    avg = sum(sizes) // done if done else 0
    print(f"{label}  {done}/{expected}  평균 {avg:>6}자  "
          f"최소 {min(sizes) if sizes else 0} / 최대 {max(sizes) if sizes else 0}")

    if missing:
        print(f"      누락 {len(missing)}건: {', '.join(m[-6:] for m in missing[:10])}"
              + (" ..." if len(missing) > 10 else ""))
    if empty:
        print(f"      빈결과 {len(empty)}건: "
              + ", ".join(f"{p[-6:]}({n}자)" for p, n in empty[:10]))

print(f"\n합계 {total_ok}/{total_src}")

# 본문 파싱 대상이 아닌 것들
others = sorted(p.suffix.lower() for p in RAW.iterdir()
                if p.suffix.lower() not in (".pdf", ".hwp", ".hwpx"))
if others:
    counts = {ext: others.count(ext) for ext in set(others)}
    print(f"본문 파싱 제외: {counts} + 파싱불가 {len(KNOWN_UNPARSABLE)}건 → API 사업개요로 대체")