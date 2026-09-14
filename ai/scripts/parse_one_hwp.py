"""hwp 1개 → hwp5html → Markdown 전체 변환 결과 확인"""
import sys, subprocess, re, tempfile
from pathlib import Path
from markdownify import markdownify

src = Path(sys.argv[1])
out_dir = src.parent / "_parsed"; out_dir.mkdir(exist_ok=True)

with tempfile.TemporaryDirectory() as tmp:
    exe = Path(sys.executable).with_name("hwp5html.exe")
    subprocess.run([str(exe), "--output", tmp, str(src)], check=True, capture_output=True)
    html = (Path(tmp) / "index.xhtml").read_text(encoding="utf-8", errors="ignore")

md = markdownify(html, heading_style="ATX", strip=["img", "span"])
md = re.sub(r"\n{3,}", "\n\n", md).strip()

dest = out_dir / (src.stem + ".md")
dest.write_text(md, encoding="utf-8")
print(f"{len(md)}자 → {dest}")
print(f"표 {html.count('<table')}개, 헤딩 {len(re.findall(r'^#', md, re.M))}개")