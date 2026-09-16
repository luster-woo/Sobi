from enum import StrEnum


class FieldSemanticType(StrEnum):
    DIRECT = "DIRECT"
    COMPUTED = "COMPUTED"
    GENERATED = "GENERATED"
    USER_INPUT = "USER_INPUT"
    IGNORE = "IGNORE"


class MappingStatus(StrEnum):
    RESOLVED = "RESOLVED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNSUPPORTED = "UNSUPPORTED"


class FieldValueType(StrEnum):
    # 기존 Python Enum은 없으며 DB 값만 동일하게 사용한다. DB 모델이 아니다.
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    JSON = "JSON"
