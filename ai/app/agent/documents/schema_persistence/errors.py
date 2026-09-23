class SchemaPersistenceError(Exception):
    """Safe domain error; never expose SQL, connection details or document contents."""

    def __init__(self, code="SCHEMA_PERSISTENCE_FAILED"):
        self.code = code
        super().__init__("문서 스키마를 저장하지 못했습니다.")

    def as_dict(self):
        return {"code": self.code, "message": str(self)}
