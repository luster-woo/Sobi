from pydantic import BaseModel, ConfigDict

from .enums import DocumentFormat


class NormalizationResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    original_path: str
    original_format: DocumentFormat
    normalized_path: str
    normalized_format: DocumentFormat
    converted: bool

