"""골든셋 정답 중 SQL 정형 필터에서 탈락한 건의 원인을 짚는다.

    python scripts/diagnose_misses.py
"""

import json
import sys
from datetime import date
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import config
from app.rag import profile as profile_mod

ROOT = Path(__file__).resolve().parents[1]
NATIONWIDE = {
    "PBLN_000000000123334", "PBLN_000000000122273", "PBLN_000000000125880",
}

SQL = """
SELECT sp.pblanc_id, sp.pblanc_nm, sp.end_date,
       pc.nationwide, pc.region_sido, pc.target_scale, pc.std_exclusion,
       pc.max_revenue, pc.min_biz_months, pc.max_biz_months
FROM support_program sp
LEFT JOIN program_condition pc ON pc.support_program_id = sp.id
WHERE sp.pblanc_id = %s
"""


def reasons(row: dict, user: dict, std_excluded: bool) -> list[str]:
    """탈락 사유 목록. 비어 있으면 통과."""
    out = []
    months = profile_mod.biz_months(date.fromisoformat(user["open_date"]))

    if row["end_date"] and row["end_date"] < date.today():
        out.append(f"마감 {row['end_date']}")
    if not row["nationwide"] and row["region_sido"] and row["region_sido"] != user["region"]:
        out.append(f"지역 {row['region_sido']} ≠ {user['region']}")
    scale = row["target_scale"]
    if scale == "소공인":
        out.append("대상 소공인 한정")
    elif scale == "소상공인" and user["employee_count"] >= 5:
        out.append(f"규모 소상공인인데 근로자 {user['employee_count']}명")
    if row["std_exclusion"] and std_excluded:
        out.append("표준제외업종")
    rev = user.get("annual_revenue")
    if row["max_revenue"] and rev and rev > row["max_revenue"]:
        out.append(f"매출 {rev:,} > {row['max_revenue']:,}")
    if row["min_biz_months"] and months < row["min_biz_months"]:
        out.append(f"업력 {months}개월 < {row['min_biz_months']}")
    if row["max_biz_months"] and months > row["max_biz_months"]:
        out.append(f"업력 {months}개월 > {row['max_biz_months']}")
    return out


def main() -> None:
    golden = json.loads((ROOT / "data/eval/golden_set.json").read_text(encoding="utf-8"))

    with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
        for p in golden["profiles"]:
            user = p["user"]
            with conn.cursor() as cur:
                cur.execute("SELECT is_std_excluded FROM minor_code WHERE code = %s",
                            (user["business_code"],))
                std_excluded = cur.fetchone()["is_std_excluded"]

            for e in p["expected"]:
                pid = e["pblancId"]
                if pid in NATIONWIDE:
                    continue
                with conn.cursor() as cur:
                    cur.execute(SQL, (pid,))
                    row = cur.fetchone()
                if row is None:
                    print(f"{p['id']}  {pid[-6:]}  DB에 없음")
                    continue
                why = reasons(row, user, std_excluded)
                if why:
                    print(f"{p['id']}  {pid[-6:]}  탈락: {' / '.join(why)}")
                    print(f"        {row['pblanc_nm'][:60]}")
                    print(f"        골든셋: {e['why'][:80]}")


if __name__ == "__main__":
    main()