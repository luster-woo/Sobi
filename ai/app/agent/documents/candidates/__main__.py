"""HWPX 또는 ParsedDocument JSON에서 후보만 JSON/요약 출력한다."""

import argparse
import json
from pathlib import Path
import sys

from pydantic import ValidationError

from ..parser import HwpxParser, DocumentParseError
from ..parser.models import ParsedDocument
from .extractor import FieldCandidateExtractor


def main():
    cli = argparse.ArgumentParser(description="문서 작성 위치 후보를 출력합니다.")
    cli.add_argument("source")
    cli.add_argument("--parsed-json", action="store_true", help="입력을 ParsedDocument JSON으로 읽기")
    cli.add_argument("--json", action="store_true", help="요약 대신 전체 후보 JSON 출력")
    args = cli.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        parsed = (ParsedDocument.model_validate_json(Path(args.source).read_text(encoding="utf-8-sig"))
                  if args.parsed_json else HwpxParser().parse(args.source))
        candidates = FieldCandidateExtractor().extract(parsed)
    except DocumentParseError as exc:
        print(json.dumps({"error": exc.as_dict()}, ensure_ascii=False), file=sys.stderr)
        return 1
    except (OSError, ValueError, ValidationError):
        print("입력 문서 또는 ParsedDocument JSON을 읽을 수 없습니다.", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps([c.model_dump(mode="json") for c in candidates], ensure_ascii=False, indent=2))
    else:
        for candidate in candidates:
            loc = candidate.target_location
            print(f"[{candidate.candidate_id}] {candidate.relation.value} {candidate.confidence:.2f}")
            print(f"label  : {candidate.label}")
            print(f"target : section={loc.section_index} table={loc.table_index} row={loc.row_index} column={loc.column_index}")
            print(f"context: {candidate.context or '-'}\n")
        print(f"총 {len(candidates)}개 후보")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

