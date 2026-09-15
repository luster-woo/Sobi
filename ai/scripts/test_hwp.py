"""hwp 전량 파싱. 결과는 data/parsed_hwp/<pblanc_id>.md"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.parsers import hwp

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "parsed_hwp"
OUT.mkdir(parents=True, exist_ok=True)

files = sorted((ROOT / "data" / "raw").glob("*.hwp"))
ok = fail = 0

KNOWN_UNPARSABLE = {
    "PBLN_000000000117948",  # 문서 속성(PIDSI_LASTPRINTED) 손상, pyhwp 파싱 불가
}

for f in files:
    if f.stem in KNOWN_UNPARSABLE:
        print(f"SKIP {f.name}  (알려진 파싱 불가, API 사업개요로 대체)")
        continue
    
    try:
        md = hwp.parse(f)
        (OUT / f"{f.stem}.md").write_text(md, encoding="utf-8")
        ok += 1
        print(f"OK   {f.name}  {len(md):>6}자")
    except Exception as e:
        fail += 1
        print(f"FAIL {f.name}  {type(e).__name__}: {e}")

print(f"\n성공 {ok} / 실패 {fail} / 전체 {len(files)}")