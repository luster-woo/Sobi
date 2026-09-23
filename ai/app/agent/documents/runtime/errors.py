class DocumentRuntimeError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__("문서 Runtime을 실행하지 못했습니다.")

    def as_dict(self):
        return {"code": self.code, "message": str(self)}
