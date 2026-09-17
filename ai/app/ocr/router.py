"""제출 서류 OCR 검증 엔드포인트. 계약: ai/docs/05_ocr_contract.md"""

import asyncio
import json
import logging
import time
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.ocr import service
from app.ocr.schemas import Expected, VerifyResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["ocr"])

MAX_BYTES = 10 * 1024 * 1024

# 확장자 → 파일 앞부분 시그니처. 확장자만 맞추고 내용이 다른 파일(깨진 파일)을 걸러낸다
SIGNATURES = {
    ".pdf": (b"%PDF",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
}

# OCR 은 CPU 를 통째로 쓴다. 동시에 돌리면 전부 느려지고 메모리 사용량이 겹치므로 한 장씩 처리한다.
# 뒤 요청은 여기서 기다린다 → 백엔드 OCR 호출 타임아웃은 넉넉히 (계약서 '성능·운영')
_one_at_a_time = asyncio.Semaphore(1)


@router.post("/verify", response_model=VerifyResponse)
async def verify(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    expected: str = Form(...),
):
    """업로드된 서류 한 장이 이 사용자의 유효한 그 서류인지 판정한다.

    검증에 실패해도 200 + status=FAILED 다. 판정까지 못 간 경우만 4xx/5xx.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SIGNATURES:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다")

    # 한도보다 1바이트 더 읽어 초과 여부만 판단한다 (큰 파일을 끝까지 메모리에 올리지 않음)
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="파일이 10MB를 넘습니다")
    if not data.startswith(SIGNATURES[ext]):
        raise HTTPException(status_code=400, detail="파일을 열 수 없습니다")

    try:
        expected_values = Expected.model_validate(json.loads(expected))
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=400, detail="expected 형식이 올바르지 않습니다")

    async with _one_at_a_time:
        started = time.perf_counter()
        try:
            result = await service.verify(data, ext, document_name, expected_values)
        except service.FileUnreadableError:
            raise HTTPException(status_code=400, detail="파일을 열 수 없습니다")
        except Exception:
            logger.exception("ocr verify 실패 document=%s", document_name)
            raise HTTPException(status_code=500, detail="OCR 처리 중 오류가 발생했습니다")
        result.elapsed_ms = int((time.perf_counter() - started) * 1000)

    # expected · extracted 에는 이름·사업자번호가 있으므로 로그에 남기지 않는다
    logger.info("ocr verify document=%s status=%s elapsed_ms=%d",
                document_name, result.status, result.elapsed_ms)
    return result
