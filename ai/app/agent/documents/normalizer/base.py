from pathlib import Path
from typing import Protocol


class Normalizer(Protocol):
    def normalize(self, source: Path, output_directory: Path) -> Path:
        """서비스가 만든 임시 복사본과 전용 작업 폴더를 받는다."""
        ...

