class DocumentWriteError(Exception):
    """Safe application error; never expose XML, values, paths or inner exceptions."""

    def __init__(self, code: str):
        self.code = code
        self.message = "문서 작성 조건 또는 파일 상태를 확인해주세요."
        super().__init__(self.message)

    def as_dict(self):
        return {"code": self.code, "message": self.message}
