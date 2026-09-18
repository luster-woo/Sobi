import argparse
import asyncio
import json
import sys

from .models import DocumentRuntimeRequest
from .service import DocumentAgentRuntime


class DisabledGenerationClient:
    async def generate(self, **kwargs):
        from .generated import GenerationError
        from .enums import RuntimeFieldStatus
        raise GenerationError("GENERATION_DISABLED", RuntimeFieldStatus.UNSUPPORTED)


async def run(request, *, generate=False):
    from app.core import db
    await db.open_pool()
    try:
        return await DocumentAgentRuntime(gms_client=None if generate else DisabledGenerationClient()).resolve(request)
    finally:
        await db.close_pool()


def main():
    parser = argparse.ArgumentParser(description="Document Runtime v3 개발 검증(Source DB 조회, --generate 선택 시 GMS 호출)")
    parser.add_argument("template_id", type=int)
    parser.add_argument("user_id", type=int)
    parser.add_argument("--show-values", action="store_true", help="개발 검증 전용: 개인정보를 포함할 수 있는 전체 결과 출력")
    parser.add_argument("--generate", action="store_true", help="실제 GMS field 단위 호출 활성화")
    args = parser.parse_args()
    try:
        result = asyncio.run(run(DocumentRuntimeRequest(template_id=args.template_id, user_id=args.user_id), generate=args.generate))
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
