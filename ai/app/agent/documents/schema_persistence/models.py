from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from ..candidates.enums import FieldInputShape
from ..parser.models import DocumentLocation


class StoredLocationInfo(BaseModel):
    """Versioned Writer target metadata stored in location_info JSONB."""

    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    target_location: DocumentLocation
    current_text: str | None = None
    input_shape: FieldInputShape
    hints: dict[str, JsonValue] = Field(default_factory=dict)


class PersistedDocumentSchema(BaseModel):
    template_id: int
    field_count: int
    source_count: int
    ignored_count: int
