from pathlib import Path
import shutil


class PassThroughNormalizer:
    def normalize(self, source: Path, output_directory: Path) -> Path:
        destination = output_directory / source.name
        with source.open("rb") as reader, destination.open("xb") as writer:
            shutil.copyfileobj(reader, writer)
        return destination

