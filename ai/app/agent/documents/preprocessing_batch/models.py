from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BatchOptions(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    reprocess_completed: bool = Field(default=False, strict=True)
    retry_failed: bool = Field(default=True, strict=True)


class ResponseModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class BatchItemResult(ResponseModel):
    program_document_id: int
    status: Literal["COMPLETED", "FAILED", "SKIPPED"]
    template_id: int | None = None
    error_code: str | None = None
    error_message: str | None = None


class BatchStarted(ResponseModel):
    batch_id: str
    status: Literal["RUNNING"] = "RUNNING"


class BatchState(ResponseModel):
    batch_id: str
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"] = "PENDING"
    total: int = 0
    processed: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error_code: str | None = None
    items: list[BatchItemResult] = Field(default_factory=list)
