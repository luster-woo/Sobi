"""hwp → 마크다운. pyhwp의 hwp5html로 XHTML을 만든 뒤 마크다운으로 변환한다.

hwp5txt는 표 내용이 유실되므로 쓰지 않는다(docs/00_precheck.md).
표는 <table> HTML 그대로 남긴다 — MinerU 출력과 형식을 맞추기 위함이다.
"""

import logging
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from bs4 import BeautifulSoup
from markdownify import markdownify

logger = logging.getLogger(__name__)

_PLACEHOLDER = "\n\nTBLMARK{}TBLMARK\n\n"


def _hwp5html_cmd(src: Path, out_dir: Path) -> list[str]:
    """venv 안의 hwp5html 실행 파일을 찾는다. 없으면 모듈로 실행."""
    exe = shutil.which("hwp5html", path=str(Path(sys.executable).parent))
    if exe:
        return [exe, "--output", str(out_dir), str(src)]
    return [sys.executable, "-m", "hwp5.hwp5html", "--output", str(out_dir), str(src)]


def _to_html(path: Path) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp) / "html"
        result = subprocess.run(
            _hwp5html_cmd(path, out_dir),
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"hwp5html 실패: {result.stderr[:300]}")

        candidates = list(out_dir.rglob("*.xhtml")) + list(out_dir.rglob("*.html"))
        if not candidates:
            raise RuntimeError(f"hwp5html 출력 없음: {path.name}")
        return candidates[0].read_text(encoding="utf-8", errors="replace")


def parse(path: Path) -> str:
    """hwp 파일을 마크다운 문자열로. 실패 시 예외를 올린다."""

    try:
        html = _to_html(path)
    except RuntimeError:
        return _clean(_fallback_text(path))
    
    soup = BeautifulSoup(html, "html.parser")

    # 스타일·스크립트·헤더는 본문이 아니다.
    for tag in soup.find_all(["style", "script", "head", "meta", "link"]):
        tag.decompose()

    # 표를 자리표시자로 빼둔다. markdownify가 태그를 벗겨버리기 때문.
    tables: list[str] = []

    for table in soup.find_all("table"):
        if table.parent is None or table.find_parent("table") is not None:
            continue  # 중첩 표는 바깥 표의 셀 텍스트로 흡수된다
        plain = _is_decorative(table)
        if plain is not None:
            table.replace_with(f"\n\n{plain}\n\n")
            continue
        tables.append(_normalize_table(table))
        table.replace_with(f"TBLMARK{len(tables) - 1}TBLMARK")

    md = markdownify(str(soup), heading_style="ATX")

    for i, table_html in enumerate(tables):
        md = md.replace(f"TBLMARK{i}TBLMARK", f"\n\n{table_html}\n\n")

    return _clean(md)


def _clean(text: str) -> str:
    # hwp5html이 남기는 XML 선언 잔재
    text = re.sub(r"^\s*xml version=.*?\?>?\s*", "", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def _normalize_table(table) -> str:
    """표에서 스타일·클래스를 걷어내고 MinerU 출력 형식에 맞춘다."""
    for cell in table.find_all(["td", "th"]):
        text = " ".join(cell.get_text(" ", strip=True).split())
        attrs = {k: v for k, v in cell.attrs.items() if k in ("rowspan", "colspan")}
        cell.clear()
        cell.attrs = attrs
        if text:
            cell.append(text)

    for el in table.find_all(["tr", "tbody", "thead", "table"]):
        el.attrs = {}
    table.attrs = {}

    return str(table)


def _is_decorative(table) -> str | None:
    """제목을 표로 감싼 hwp 관습. 셀이 하나뿐이면 표가 아니라 문단이다."""
    cells = [c for c in table.find_all(["td", "th"]) if c.get_text(strip=True)]
    if len(cells) == 1:
        return " ".join(cells[0].get_text(" ", strip=True).split())
    return None


def _fallback_text(path: Path) -> str:
    """hwp5html이 실패한 파일의 최후 수단. 표 내용은 유실된다."""
    exe = shutil.which("hwp5txt", path=str(Path(sys.executable).parent))
    cmd = [exe, str(path)] if exe else [sys.executable, "-m", "hwp5.hwp5txt", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"hwp5txt도 실패: {result.stderr[:200]}")
    logger.warning("%s: hwp5html 실패로 hwp5txt 폴백. 표 유실됨", path.name)
    return result.stdout