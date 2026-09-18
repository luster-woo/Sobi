class DraftError(Exception):
    def __init__(self, code, status=500, *, details=None):
        self.code = code
        self.status = status
        self.details = details
        self.message = ("자동 작성에 필요한 정보를 확인할 수 없습니다."
                        if code == "DRAFT_NOT_READY" else "문서 초안 요청 조건 또는 파일 상태를 확인해주세요.")
        super().__init__(self.message)

    def as_dict(self):
        result = {"code": self.code, "message": self.message}
        if self.details is not None:
            result["details"] = self.details
        return result
