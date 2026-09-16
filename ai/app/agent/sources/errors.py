class SourceError(Exception):
    """외부로 전달 가능한 고정 코드/메시지. DB 예외 문자열은 포함하지 않는다."""

    def __init__(self, code: str, message: str, *, missing: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.missing = missing

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}

