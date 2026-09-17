import os
from functools import lru_cache
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from .errors import BatchError
from .models import BatchOptions, BatchStarted, BatchState
from .service import build_service
from .store import InMemoryBatchStore


def require_internal_deployment():
    # A deployment switch, NOT authentication. Existing FastAPI has no admin dependency.
    if os.getenv("DOCUMENT_AGENT_BATCH_API_ENABLED", "false").lower() != "true":
        raise HTTPException(503, detail={"code": "BATCH_API_DISABLED", "message": "운영 내부망 설정 후 활성화하세요."})


@lru_cache(maxsize=1)
def get_store():
    return InMemoryBatchStore()


def get_service():
    try:
        return build_service(get_store())
    except BatchError as exc:
        raise HTTPException(503, detail=exc.as_dict()) from None


router = APIRouter(prefix="/api/v1/document-agent/preprocessing/batches",
                   tags=["document-agent"], dependencies=[Depends(require_internal_deployment)])


@router.post("", status_code=202, response_model=BatchStarted)
async def start_batch(options: BatchOptions, background_tasks: BackgroundTasks, service=Depends(get_service)):
    try:
        state = service.start()
    except BatchError as exc:
        raise HTTPException(409 if exc.code == "BATCH_ALREADY_RUNNING" else 503, detail=exc.as_dict()) from None
    background_tasks.add_task(service.run, state.batch_id, options)
    return BatchStarted(batch_id=state.batch_id)


@router.get("/{batch_id}", response_model=BatchState)
async def get_batch(batch_id: UUID, store=Depends(get_store)):
    try:
        return store.get(str(batch_id))
    except BatchError as exc:
        raise HTTPException(404, detail=exc.as_dict()) from None
