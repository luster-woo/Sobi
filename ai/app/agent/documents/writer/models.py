from pydantic import BaseModel


class HwpxWriteResult(BaseModel):
    source_path: str
    output_path: str
    total_fields: int
    written_count: int
    skipped_count: int
