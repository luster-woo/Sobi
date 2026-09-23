def normalize_label(text: str) -> str:
    """공백만 제거한다. 원본, 대소문자, 구두점, 의미는 변환하지 않는다."""
    return "".join(text.split())

