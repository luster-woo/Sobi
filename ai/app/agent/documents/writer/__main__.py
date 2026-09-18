"""Developer-only Runtime -> Writer orchestration. Core Writer never runs Runtime."""
import argparse
import asyncio
import json
from pathlib import Path
import sys

from ..runtime.__main__ import run as run_runtime
from ..runtime.models import DocumentRuntimeRequest
from . import HwpxWriter, DocumentWriteError


async def run(request, *, output, generate=False):
    result = await run_runtime(request, generate=generate)
    if not result.normalized_path:
        raise DocumentWriteError("SOURCE_FILE_NOT_FOUND")
    return HwpxWriter().write(source_path=result.normalized_path, runtime_result=result, output_path=output)


def main():
    parser = argparse.ArgumentParser(description="HWPX Writer v1.1 개발 검증: Runtime DB 조회 후 별도 파일 생성")
    parser.add_argument("template_id", type=int)
    parser.add_argument("user_id", type=int)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--generate", action="store_true", help="Runtime에서 실제 GMS 호출 허용")
    args = parser.parse_args()
    try:
        request = DocumentRuntimeRequest(template_id=args.template_id, user_id=args.user_id)
        result = asyncio.run(run(request, output=args.output, generate=args.generate))
    except DocumentWriteError as exc:
        print(json.dumps(exc.as_dict(), ensure_ascii=False), file=sys.stderr)
        return 1
    except Exception:
        print(json.dumps({"code": "WRITER_CLI_FAILED", "message": "입력 및 실행 환경을 확인해주세요."}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(result.model_dump_json(include={"total_fields", "written_count", "skipped_count"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
