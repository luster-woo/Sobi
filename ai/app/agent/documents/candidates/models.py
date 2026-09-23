from pydantic import BaseModel, Field, JsonValue

from ..parser.models import DocumentLocation
from .enums import CandidateRelation, FieldInputShape


class FieldCandidate(BaseModel):
    candidate_id: str
    label: str
    normalized_label: str
    relation: CandidateRelation
    label_location: DocumentLocation
    target_location: DocumentLocation
    current_text: str | None = None
    input_shape: FieldInputShape = FieldInputShape.UNKNOWN
    context: str | None = None
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    hints: dict[str, JsonValue] = Field(default_factory=dict)

