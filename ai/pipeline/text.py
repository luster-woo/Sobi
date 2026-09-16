"""본문 텍스트 축약. 추출·청킹에서 공용으로 쓴다.

파싱 결과의 71%가 표인데, 대부분은 제외업종 목록·매출 기준표·신청서 양식이라
자격 판정에 쓸모가 없다. 조건이 담긴 표(5~10행)는 남기고 긴 표만 줄인다.
"""

import re

TABLE = re.compile(r"<table>.*?</table>", re.S)
ROW = re.compile(r"<tr>.*?</tr>", re.S)
DEFAULT_SPAN = re.compile(r'\s+(?:rowspan|colspan)=["\']?1["\']?')

MAX_ROWS = 8        # 이보다 긴 표는 줄인다
KEEP_ROWS = 3       # 남길 앞부분 행 수


def _shrink_table(match: re.Match) -> str:
    table = DEFAULT_SPAN.sub("", match.group(0))
    rows = ROW.findall(table)
    if len(rows) <= MAX_ROWS:
        return table
    kept = "".join(rows[:KEEP_ROWS])
    return f"<table>{kept}</table>(표 {len(rows)}행 중 {KEEP_ROWS}행만 표시)"


def shrink(text: str) -> str:
    """표를 축약한 본문을 돌려준다."""
    return TABLE.sub(_shrink_table, text)