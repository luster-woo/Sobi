"""hwp(pyhwp) / hwpx(zip+xml) 텍스트 추출 가능 여부 실측"""
import subprocess, zipfile, re, sys
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
N = 5  # 포맷별 시도 개수

def hwpx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as z:
        sections = sorted(n for n in z.namelist() if re.match(r"Contents/section\d+\.xml", n))
        out = []
        for s in sections:
            xml = z.read(s).decode("utf-8", errors="ignore")
            out.append(re.sub(r"<[^>]+>", " ", xml))  # 태그 제거 (러프)
        return re.sub(r"\s+", " ", " ".join(out))

def hwp_text(path: Path) -> str:
    exe = Path(sys.executable).with_name("hwp5txt.exe")
    r = subprocess.run([str(exe), str(path)],
                       capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip()[-150:])
    return re.sub(r"\s+", " ", r.stdout)

for ext, fn in (("hwpx", hwpx_text), ("hwp", hwp_text)):
    files = sorted(RAW.glob(f"*.{ext}"))[:N]
    print(f"\n=== {ext} ({len(files)}건 시도) ===")
    for f in files:
        try:
            t = fn(f)
            hit = "신청자격" in t or "지원대상" in t or "신청대상" in t
            print(f"OK   {f.name}  {len(t):6d}자  자격섹션={'Y' if hit else 'N'}  | {t[:60]}")
        except Exception as e:
            print(f"FAIL {f.name}  {type(e).__name__}: {str(e)[:100]}")