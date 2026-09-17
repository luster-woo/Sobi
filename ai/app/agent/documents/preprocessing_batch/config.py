import os
from dataclasses import dataclass
from pathlib import Path

from .errors import BatchError


@dataclass(frozen=True)
class BatchSettings:
    original_root: Path
    normalized_root: Path

    @classmethod
    def from_env(cls):
        # Reuse existing root .env loading; add no changes to shared configuration.
        from app.core import config  # noqa: F401
        original = os.getenv("DOCUMENT_AGENT_ORIGINAL_ROOT")
        normalized = os.getenv("DOCUMENT_AGENT_NORMALIZED_ROOT")
        if not original or not normalized:
            raise BatchError("BATCH_ROOT_NOT_CONFIGURED")
        return cls(Path(original), Path(normalized))

    def validate(self):
        if not self.original_root.is_absolute() or not self.normalized_root.is_absolute():
            raise BatchError("BATCH_ROOT_INVALID")
        source, target = self.original_root.resolve(), self.normalized_root.resolve()
        if source.is_relative_to(target) or target.is_relative_to(source):
            raise BatchError("BATCH_ROOT_OVERLAP")
        if not source.is_dir():
            raise BatchError("BATCH_ORIGINAL_ROOT_NOT_FOUND")
        if target.exists() and not target.is_dir():
            raise BatchError("BATCH_NORMALIZED_ROOT_INVALID")
