MESSAGES = {
    "UNSUPPORTED_FORMAT": "지원하지 않는 문서 형식입니다.",
    "SOURCE_NOT_FOUND": "원본 파일을 찾을 수 없습니다.",
    "SOURCE_NOT_FILE": "원본 경로가 일반 파일이 아닙니다.",
    "INVALID_PATH": "파일 경로가 올바르지 않습니다.",
    "INVALID_OUTPUT_DIRECTORY": "출력 경로가 디렉터리가 아닙니다.",
    "DEPENDENCY_MISSING": "문서 변환에 필요한 외부 프로그램이 설치되어 있지 않습니다.",
    "CONVERTER_START_FAILED": "문서 변환 프로그램을 실행할 수 없습니다.",
    "CONVERTER_FAILED": "문서 형식 변환에 실패했습니다.",
    "CONVERTER_TIMEOUT": "문서 변환 제한 시간을 초과했습니다.",
    "OUTPUT_NOT_CREATED": "변환 결과 파일이 생성되지 않았거나 비어 있습니다.",
    "FILE_IO_ERROR": "문서 파일을 읽거나 저장할 수 없습니다.",
    "NORMALIZATION_FAILED": "문서 정규화 처리 중 오류가 발생했습니다.",
}


class NormalizationError(Exception):
    """경로/원본 예외를 보관하지 않는다. as_dict()만 외부 오류 응답에 사용."""

    def __init__(self, code: str, *, stage: str, returncode: int | None = None,
                 dependency: str | None = None):
        super().__init__(MESSAGES[code])
        self.code = code
        self.message = MESSAGES[code]
        self.stage = stage
        self.returncode = returncode
        self.dependency = dependency

    def as_dict(self) -> dict[str, str]:
        result = {"code": self.code, "message": self.message}
        if self.dependency is not None:
            result["dependency"] = self.dependency
        return result
