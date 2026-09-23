MESSAGES = {
    "UNSUPPORTED_FORMAT": "HWPX 파일만 파싱할 수 있습니다.",
    "SOURCE_NOT_FOUND": "입력 문서가 없습니다.",
    "SOURCE_NOT_FILE": "입력 경로가 일반 파일이 아닙니다.",
    "INVALID_ZIP": "HWPX ZIP 파일이 손상되었거나 지원하지 않는 압축 형식입니다.",
    "SECTION_NOT_FOUND": "HWPX section XML이 없습니다.",
    "INVALID_SECTION": "HWPX section 구조가 올바르지 않습니다.",
    "MALFORMED_XML": "HWPX XML을 읽을 수 없습니다.",
    "XML_DTD_UNSUPPORTED": "DTD가 포함된 XML은 지원하지 않습니다.",
    "DOCUMENT_LIMIT_EXCEEDED": "문서가 Parser의 크기 또는 깊이 제한을 초과했습니다.",
    "FILE_READ_ERROR": "입력 문서를 읽을 수 없습니다.",
}


class DocumentParseError(Exception):
    def __init__(self, code: str):
        super().__init__(MESSAGES[code])
        self.code = code
        self.message = MESSAGES[code]

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}

