from enum import StrEnum


class CandidateRelation(StrEnum):
    RIGHT = "RIGHT"
    BELOW = "BELOW"
    SAME_CELL = "SAME_CELL"


class FieldInputShape(StrEnum):
    SHORT_TEXT = "SHORT_TEXT"
    LONG_TEXT = "LONG_TEXT"
    NUMBER = "NUMBER"
    DATE = "DATE"
    CHECKBOX = "CHECKBOX"
    UNKNOWN = "UNKNOWN"

