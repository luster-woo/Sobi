from enum import StrEnum


class DocumentFormat(StrEnum):
    HWPX = "HWPX"
    DOCX = "DOCX"


class LocationType(StrEnum):
    PARAGRAPH_INLINE = "PARAGRAPH_INLINE"
    PARAGRAPH = "PARAGRAPH"
    TABLE = "TABLE"
    TABLE_CELL = "TABLE_CELL"

