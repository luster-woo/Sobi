"""hwpx 전량 파싱. 결과는 data/parsed_hwpx/<pblanc_id>.md"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.parsers import hwpx

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "parsed_hwpx"
OUT.mkdir(parents=True, exist_ok=True)

files = sorted((ROOT / "data" / "raw").glob("*.hwpx"))
ok = fail = 0
for f in files:
    try:
        md = hwpx.parse(f)
        (OUT / f"{f.stem}.md").write_text(md, encoding="utf-8")
        ok += 1
        print(f"OK   {f.name}  {len(md):>6}자")
    except Exception as e:
        fail += 1
        print(f"FAIL {f.name}  {type(e).__name__}: {e}")

print(f"\n성공 {ok} / 실패 {fail} / 전체 {len(files)}")