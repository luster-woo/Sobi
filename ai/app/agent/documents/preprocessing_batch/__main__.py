import argparse
import asyncio
import json
import sys

from .models import BatchOptions
from .service import build_service


async def run(options):
    from app.core import db
    await db.open_pool()
    try:
        service = build_service()
        state = service.start()
        return await service.run(state.batch_id, options)
    finally:
        await db.close_pool()


def main():
    parser = argparse.ArgumentParser(description="작성용 문서 Batch 전처리(DB 변경/GMS 비용 발생, 단일 프로세스 전용)")
    parser.add_argument("--reprocess-completed", action="store_true")
    parser.add_argument("--no-retry-failed", action="store_true")
    args = parser.parse_args()
    try:
        state = asyncio.run(run(BatchOptions(reprocess_completed=args.reprocess_completed,
                                             retry_failed=not args.no_retry_failed)))
    except Exception:
        print(json.dumps({"code": "BATCH_START_FAILED", "message": "Batch 실행 설정을 확인하세요."}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(state.model_dump_json(by_alias=True, indent=2))
    return 1 if state.status == "FAILED" or state.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
