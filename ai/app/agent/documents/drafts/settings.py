import os
from dataclasses import dataclass
from pathlib import Path

from .errors import DraftError


@dataclass(frozen=True)
class DraftSettings:
    generated_root: Path

    @classmethod
    def from_env(cls):
        from app.core import config  # noqa: F401; existing .env convention
        value = os.getenv("DOCUMENT_AGENT_GENERATED_ROOT")
        if not value:
            raise DraftError("DRAFT_ROOT_NOT_CONFIGURED", 503)
        return cls(Path(value))

    def root(self, *, create=False):
        if not self.generated_root.is_absolute():
            raise DraftError("DRAFT_ROOT_INVALID", 503)
        try:
            root = self.generated_root.resolve()
            if create:
                root.mkdir(parents=True, exist_ok=True)
            if not root.is_dir():
                raise DraftError("DRAFT_ROOT_INVALID", 503)
            return root
        except (OSError, RuntimeError):
            raise DraftError("DRAFT_ROOT_INVALID", 503) from None

    def download_path(self, record):
        root = self.root()
        expected_name = f"draft-{record.response.draft_id}.hwpx"
        try:
            path = record.generated_file_path.resolve()
            # Only direct children with our UUID-derived name can be downloaded.
            if path.parent != root or path.name != expected_name or record.response.file_name != expected_name:
                raise DraftError("DRAFT_PATH_INVALID", 403)
            if record.generated_file_path.is_symlink():
                raise DraftError("DRAFT_PATH_INVALID", 403)
            if not path.is_file():
                raise DraftError("DRAFT_FILE_NOT_FOUND", 404)
            return path
        except (OSError, RuntimeError):
            raise DraftError("DRAFT_FILE_NOT_FOUND", 404) from None
