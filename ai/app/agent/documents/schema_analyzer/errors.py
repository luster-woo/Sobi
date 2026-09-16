class SchemaAnalysisError(Exception):
    """원문 응답/SDK exception/API key를 외부로 전달하지 않는다."""

    def __init__(self, code="SCHEMA_VALIDATION_FAILED"):
        self.code = code
        super().__init__("문서 필드 분석을 완료하지 못했습니다.")

    def as_dict(self):
        return {"code": self.code, "message": str(self)}
