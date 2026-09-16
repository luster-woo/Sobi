from typing import Literal

from pydantic import BaseModel

from ..normalizer.enums import DocumentFormat


class TemplatePreprocessResult(BaseModel):
    template_id: int
    program_document_id: int
    status: Literal["COMPLETED"] = "COMPLETED"
    normalized_format: DocumentFormat
    normalized_path: str
    field_count: int
    source_count: int
