import argparse
import asyncio
import json
import sys

from ..normalizer.enums import DocumentFormat
from .service import TemplatePreprocessingService


async def run(args):
    from app.core import db
    await db.open_pool()
    try:
        return await TemplatePreprocessingService().preprocess(
            args.program_document_id, args.source_path, args.output_directory,
            original_format=DocumentFormat(args.original_format),
        )
    finally:
        await db.close_pool()


def main():
    parser = argparse.ArgumentParser(description="단일 작성용 문서를 전처리합니다(DB 변경 및 GMS API 비용 발생).")
    parser.add_argument("program_document_id", type=int)
    parser.add_argument("source_path")
    parser.add_argument("output_directory")
    parser.add_argument("--original-format", required=True, choices=[item.value for item in DocumentFormat])
    args = parser.parse_args()
    try:
        result = asyncio.run(run(args))
    except Exception:
        # Application service rethrows original exceptions. CLI does not expose their contents.
        print(json.dumps({"code": "PREPROCESSING_FAILED", "message": "전처리에 실패했습니다. 상태와 내부 로그를 확인하세요."}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
