import argparse
import asyncio
import json
from pathlib import Path
import sys

from .models import DocumentRuntimeRequest
from .service import DocumentAgentRuntime


async def run(request):
    from app.core import db
    await db.open_pool()
    try:
        return await DocumentAgentRuntime().resolve(request)
    finally:
        await db.close_pool()


def main():
    parser = argparse.ArgumentParser(description="Document Runtime v1 개발 검증(Source DB 조회, Writer/GMS 실행 없음)")
    parser.add_argument("template_id", type=int)
    parser.add_argument("user_id", type=int)
    parser.add_argument("--user-inputs", type=Path, help="field_key 기준 JSON 객체 파일")
    parser.add_argument("--show-values", action="store_true", help="개발 검증 전용: 개인정보를 포함할 수 있는 전체 결과 출력")
    args = parser.parse_args()
    try:
        inputs = json.loads(args.user_inputs.read_text(encoding="utf-8-sig")) if args.user_inputs else {}
        result = asyncio.run(run(DocumentRuntimeRequest(template_id=args.template_id, user_id=args.user_id, user_inputs=inputs)))
    except Exception:
        print(json.dumps({"code": "RUNTIME_FAILED", "message": "입력 및 DB 상태를 확인하세요."}, ensure_ascii=False), file=sys.stderr)
        return 1
    if args.show_values:
        print(result.model_dump_json(indent=2))
    else:
        print(json.dumps({
            "template_id": result.template_id, "program_document_id": result.program_document_id,
            "total_fields": result.total_fields, "ready_for_write": result.ready_for_write,
            "status_counts": result.status_counts,
            "fields": [{"field_key": field.field_key, "runtime_status": field.runtime_status,
                        "error_code": field.error_code} for field in result.fields],
        }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
