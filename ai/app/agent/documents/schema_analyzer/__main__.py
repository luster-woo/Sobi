import argparse
import asyncio
import json
from pathlib import Path
import sys

from pydantic import TypeAdapter, ValidationError

from ..candidates.models import FieldCandidate
from . import GmsSchemaAnalyzer, GmsSchemaAnalyzerClient, SchemaAnalysisError


def main():
    parser = argparse.ArgumentParser(description="Candidate JSON을 GMS로 의미 분석합니다(API 비용 발생).")
    parser.add_argument("source")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        candidates = TypeAdapter(list[FieldCandidate]).validate_json(Path(args.source).read_text(encoding="utf-8-sig"))
        result = asyncio.run(GmsSchemaAnalyzer(client=GmsSchemaAnalyzerClient(model=args.model)).analyze(candidates))
    except (OSError, ValidationError, UnicodeError):
        print("Candidate JSON을 읽을 수 없습니다.", file=sys.stderr)
        return 1
    except SchemaAnalysisError as exc:
        print(json.dumps(exc.as_dict(), ensure_ascii=False), file=sys.stderr)
        return 1
    if args.json:
        print(result.model_dump_json(indent=2))
    else:
        for item in result.fields:
            field = item.analysis
            print(f"{field.candidate_id} | {field.field_label} | {field.semantic_type} | {field.mapping_status} | {field.field_key}")
        print(f"총 {len(result.fields)}개 (IGNORE 포함)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
