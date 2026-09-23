"""python -m app.agent.documents.parser SOURCE.hwpx"""

import argparse
import json
import sys

from .errors import DocumentParseError
from .hwpx import HwpxParser


def main():
    arguments = argparse.ArgumentParser(description="HWPX 구조를 JSON으로 출력합니다.")
    arguments.add_argument("source")
    args = arguments.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        print(HwpxParser().parse(args.source).model_dump_json(indent=2))
    except DocumentParseError as exc:
        print(json.dumps({"error": exc.as_dict()}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

