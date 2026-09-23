from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from ..runtime.models import Id


class DraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", alias_generator=to_camel)
    template_id: Id
    user_id: Id


class DraftResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", alias_generator=to_camel, populate_by_name=True, frozen=True)
    draft_id: UUID
    template_id: Id
    program_document_id: Id
    status: Literal["COMPLETED"] = "COMPLETED"
    file_name: str
    written_field_count: int
    left_blank_field_count: int
    unsupported_field_count: int


@dataclass(frozen=True)
class DraftRecord:
    """Process-local metadata only. Never retain Runtime results or field values."""
    response: DraftResponse
    generated_file_path: Path
    created_at: datetime
