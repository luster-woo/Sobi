class BatchError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__("문서 전처리 Batch 요청을 처리하지 못했습니다.")

    def as_dict(self):
        return {"code": self.code, "message": str(self)}
