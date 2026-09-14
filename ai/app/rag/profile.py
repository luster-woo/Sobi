"""사업자 프로필 → 검색 질의문.

임베딩 모델이 읽을 문장을 만든다. 공고문이 공문체라 키워드 나열보다
서술문이 잘 붙는지는 티켓 F에서 실측할 것.
"""

from datetime import date

CS_MAJOR = {"CS1": "외식업", "CS2": "서비스업", "CS3": "소매업"}


def biz_months(open_date: date, today: date | None = None) -> int:
    """개업일로부터 경과 개월 수."""
    today = today or date.today()
    months = (today.year - open_date.year) * 12 + (today.month - open_date.month)
    if today.day < open_date.day:
        months -= 1
    return max(months, 0)


def to_query(
    *,
    region: str,
    address: str,
    business_name: str,
    business_code: str,
    employee_count: int,
    open_date: date,
    annual_revenue: int | None,
) -> str:
    """프로필을 한 문단짜리 서술문으로."""
    months = biz_months(open_date)
    parts = [
        f"{address.split()[0]} {address.split()[1] if len(address.split()) > 1 else ''}".strip()
        + f"에서 {business_name}을 운영하는 소상공인.",
        f"업력 {months // 12}년 {months % 12}개월, 상시근로자 {employee_count}명.",
    ]
    if annual_revenue:
        parts.append(f"연매출 {annual_revenue / 100_000_000:.1f}억원.")
    major = CS_MAJOR.get(business_code[:3], "")
    if major:
        parts.append(f"업종 분류는 {major}.")
    return " ".join(parts)