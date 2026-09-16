"""검증 오류를 작은 구조로 정규화한다. 원문/trace/label을 복사하지 않는다."""
import re
from pydantic import ValidationError

from ...sources.enums import SourceType
from .enums import FieldSemanticType, MappingStatus, FieldValueType

MAX_REPAIR_ERRORS = 24
SAFE_ID = re.compile(r"(?:candidate_\d{1,8}|c\d{1,8})")
SAFE_ENUM = re.compile(r"[A-Z][A-Z_]{0,63}")
PATH_NAMES = frozenset({"fields", "candidate_id", "semantic_type", "mapping_status", "field_key",
    "field_label", "value_type", "required", "instruction", "sources", "confidence", "note",
    "source_type", "source_key", "priority", "query_hint", "source_params", "months"})
ENUMS = {"semantic_type": FieldSemanticType, "mapping_status": MappingStatus,
         "value_type": FieldValueType, "source_type": SourceType}


def safe_id(value, candidates):
    return value if isinstance(value, str) and value in {c.candidate_id for c in candidates} and SAFE_ID.fullmatch(value) else None


def safe_path(location):
    path = ""
    for part in location:
        if isinstance(part, int) and 0 <= part <= 1_000_000:
            path += f"[{part}]"
        elif isinstance(part, str) and part in PATH_NAMES:
            path += ("." if path else "") + part
        else:
            path += ".<unknown>"
    return path or "$"


def safe_received(value, enum_field):
    # Enum tokens만 수집한다. 문자열 필드/params/개인정보/인증 정보는 재전송하지 않는다.
    if enum_field and isinstance(value, str) and SAFE_ENUM.fullmatch(value):
        return value
    return "<redacted>"


def repair_errors(exc, data, candidates, catalog):
    if not isinstance(exc, ValidationError):
        details = getattr(exc, "details", {})
        error = {"candidate_id": safe_id(details.get("candidate_id"), candidates),
                 "path": safe_path(details.get("path", ())), "code": str(exc)}
        if details.get("allowed") is not None:
            error["allowed"] = details["allowed"]
        if "received" in details:
            error["received"] = safe_received(details["received"], True)
        return [error]
    errors = []
    for item in exc.errors(include_url=False, include_context=False)[:MAX_REPAIR_ERRORS]:
        loc = list(item["loc"])
        cid = None
        if len(loc) >= 2 and loc[0] == "fields" and isinstance(loc[1], int):
            fields = data.get("fields", []) if isinstance(data, dict) else []
            if isinstance(fields, list) and loc[1] < len(fields) and isinstance(fields[loc[1]], dict):
                cid = safe_id(fields[loc[1]].get("candidate_id"), candidates)
            loc = loc[2:]
        name = loc[-1] if loc else None
        enum = ENUMS.get(name)
        allowed = ([key.value for key in catalog.entries] if name == "source_key"
                   else [value.value for value in enum] if enum else None)
        code = "SCHEMA_CONTRACT_" + item["type"].upper()
        if name == "source_key" and item["type"] == "enum":
            code = "SOURCE_KEY_NOT_ALLOWED"
        error = {"candidate_id": cid, "path": safe_path(loc), "code": code,
                 "received": safe_received(item.get("input"), allowed is not None)}
        if allowed is not None:
            error["allowed"] = allowed
        errors.append(error)
    return errors
