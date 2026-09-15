"""hwpx → 마크다운. zip 안의 Contents/section*.xml을 직접 파싱한다.

hwpx는 OWPML 포맷이고 본문이 표준 XML이라 외부 도구가 필요 없다.
표는 <table> HTML로 남긴다 — MinerU·hwp 출력과 형식을 맞추기 위함이다.
"""

import logging
import re
import zipfile
from html import escape
from pathlib import Path
from xml.etree import ElementTree

logger = logging.getLogger(__name__)

NS = {"hp": "http://www.hancom.co.kr/hwpml/2011/paragraph"}
_SECTION = re.compile(r"Contents/section(\d+)\.xml$")


def _tag(el) -> str:
    """네임스페이스를 뗀 태그명."""
    return el.tag.rsplit("}", 1)[-1]


def _cell_text(tc) -> str:
    return " ".join("".join(tc.itertext()).split())


def _render_table(tbl) -> str | None:
    """표를 HTML로. 셀이 하나뿐인 장식용 표는 None을 돌려준다."""
    rows = []
    filled = 0
    for tr in tbl.findall("hp:tr", NS):
        cells = []
        for tc in tr.findall("hp:tc", NS):
            span = tc.find("hp:cellSpan", NS)
            col = span.get("colSpan", "1") if span is not None else "1"
            row = span.get("rowSpan", "1") if span is not None else "1"
            text = _cell_text(tc)
            if text:
                filled += 1
            cells.append(f'<td rowspan="{row}" colspan="{col}">{escape(text)}</td>')
        if cells:
            rows.append("<tr>" + "".join(cells) + "</tr>")

    if not rows:
        return None
    if filled <= 1:
        # 제목을 표로 감싼 한글 문서 관습. 표가 아니라 문단이다.
        return None
    return "<table>" + "".join(rows) + "</table>"


def _flush(out: list[str], buf: list[str]) -> None:
    text = "".join(buf).strip()
    if text:
        out.append(" ".join(text.split()))
    buf.clear()


def _walk(node, out: list[str], buf: list[str]) -> None:
    """문서 순서를 지키며 문단과 표를 모은다."""
    for child in node:
        name = _tag(child)
        if name == "tbl":
            _flush(out, buf)
            html = _render_table(child)
            if html:
                out.append(html)
            else:
                # 장식용 표는 안의 글자만 문단으로 꺼낸다.
                text = " ".join("".join(child.itertext()).split())
                if text:
                    out.append(text)
        elif name == "t":
            buf.append("".join(child.itertext()))
        elif name == "p":
            _walk(child, out, buf)
            _flush(out, buf)  # 문단 경계
        elif name in ("lineBreak", "linesegarray"):
            buf.append(" ")
        else:
            _walk(child, out, buf)


def parse(path: Path) -> str:
    """hwpx 파일을 마크다운 문자열로. 실패 시 예외를 올린다."""
    blocks: list[str] = []

    with zipfile.ZipFile(path) as zf:
        sections = sorted(
            (n for n in zf.namelist() if _SECTION.search(n)),
            key=lambda n: int(_SECTION.search(n).group(1)),
        )
        if not sections:
            raise RuntimeError(f"section xml 없음: {path.name}")

        for name in sections:
            root = ElementTree.fromstring(zf.read(name))
            buf: list[str] = []
            _walk(root, blocks, buf)
            _flush(blocks, buf)

    if not blocks:
        raise RuntimeError(f"본문 없음: {path.name}")
    return "\n\n".join(blocks)