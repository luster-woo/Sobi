class TemplatePreprocessingError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__("문서 템플릿 전처리를 완료하지 못했습니다.")

    def as_dict(self):
        return {"code": self.code, "message": str(self)}
