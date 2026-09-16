from __future__ import annotations

from typing import Annotated, Literal
from pydantic import BaseModel, Field, JsonValue

from .enums import DocumentFormat, LocationType


class DocumentLocation(BaseModel):
    type: LocationType
    section_index: int
    block_index: int | None = None
    table_index: int | None = None
    row_index: int | None = None
    column_index: int | None = None
    paragraph_index: int | None = None
    native_ref: dict[str, JsonValue] = Field(default_factory=dict)


class ParsedParagraph(BaseModel):
    block_type: Literal["PARAGRAPH"] = "PARAGRAPH"
    block_index: int
    text: str
    location: DocumentLocation
    has_non_text_content: bool = False


class ParsedTable(BaseModel):
    block_type: Literal["TABLE"] = "TABLE"
    block_index: int
    table_index: int
    rows: list[ParsedTableRow]
    location: DocumentLocation


class ParsedTableRow(BaseModel):
    row_index: int
    cells: list[ParsedTableCell]


class ParsedTableCell(BaseModel):
    row_index: int
    column_index: int
    row_span: int = 1
    column_span: int = 1
    text: str
    paragraphs: list[ParsedParagraph]
    blocks: list[ParsedBlock] = Field(default_factory=list)
    is_empty: bool
    has_non_text_content: bool = False
    location: DocumentLocation


ParsedBlock = Annotated[ParsedParagraph | ParsedTable, Field(discriminator="block_type")]


class ParsedSection(BaseModel):
    section_index: int
    blocks: list[ParsedBlock]


class ParsedDocument(BaseModel):
    format: DocumentFormat
    sections: list[ParsedSection]
    metadata: dict[str, JsonValue] = Field(default_factory=dict)


ParsedTable.model_rebuild()
ParsedTableRow.model_rebuild()
ParsedTableCell.model_rebuild()

