from pathlib import Path

from ..normalizer.enums import DocumentFormat
from .errors import BatchError


def resolve_source(settings, program_document_id):
    if type(program_document_id) is not int or program_document_id <= 0:
        raise BatchError("INVALID_PROGRAM_DOCUMENT_ID")
    root = settings.original_root.resolve()
    directory = root / str(program_document_id)
    if directory.is_symlink() or directory.resolve() != directory:
        raise BatchError("UNSAFE_SOURCE_PATH")
    if not directory.is_dir():
        raise BatchError("SOURCE_DIRECTORY_NOT_FOUND")
    candidates = []
    for entry in directory.iterdir():
        if entry.name.startswith((".", "~")) or entry.name.endswith("~"):
            continue
        try:
            format_ = DocumentFormat(entry.suffix.lstrip(".").upper())
        except ValueError:
            continue
        if entry.is_symlink() or not entry.resolve().is_relative_to(directory.resolve()):
            raise BatchError("UNSAFE_SOURCE_PATH")
        if entry.is_file():
            # Windows FILE_ATTRIBUTE_HIDDEN / TEMPORARY; no effect on Linux.
            if getattr(entry.stat(), "st_file_attributes", 0) & (2 | 256):
                continue
            candidates.append((entry, format_))
    if not candidates:
        raise BatchError("SOURCE_FILE_NOT_FOUND")
    if len(candidates) != 1:
        raise BatchError("MULTIPLE_SOURCE_FILES")
    source, format_ = candidates[0]
    if format_ not in (DocumentFormat.HWP, DocumentFormat.HWPX):
        raise BatchError("PARSER_FORMAT_UNSUPPORTED")
    target_root = settings.normalized_root.resolve()
    output = target_root / str(program_document_id)
    if output.is_symlink() or output.resolve() != output:
        raise BatchError("UNSAFE_OUTPUT_PATH")
    return source, output, format_
