from pathlib import Path
from typing import Protocol

from .models import ParsedDocument


class DocumentParser(Protocol):
    def parse(self, source_path: str | Path) -> ParsedDocument: ...

