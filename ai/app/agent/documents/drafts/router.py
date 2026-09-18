from functools import lru_cache
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute

from .errors import DraftError
from .models import DraftRequest, DraftResponse
from .service import DraftGenerationService
from .settings import DraftSettings
from .store import InMemoryDraftStore


class DraftRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def safe_validation(request):
            try:
                return await handler(request)
            except RequestValidationError:
                # Do not echo rejected extra path/value fields in FastAPI's default errors.
                raise HTTPException(422, detail={"code": "INVALID_DRAFT_REQUEST",
                                               "message": "요청 형식을 확인해주세요."}) from None
        return safe_validation


def require_internal_deployment():
    # Deployment switch only, not authentication (same convention as Batch).
    if os.getenv("DOCUMENT_AGENT_DRAFT_API_ENABLED", "false").lower() != "true":
        raise HTTPException(503, detail={"code": "DRAFT_API_DISABLED",
                                       "message": "운영 내부망 설정 후 활성화하세요."})


@lru_cache(maxsize=1)
def get_store():
    return InMemoryDraftStore()


def get_settings():
    try:
        return DraftSettings.from_env()
    except DraftError as exc:
        raise HTTPException(exc.status, detail=exc.as_dict()) from None


def get_service(settings=Depends(get_settings), store=Depends(get_store)):
    return DraftGenerationService(settings=settings, store=store)


router = APIRouter(prefix="/api/v1/document-agent/drafts", tags=["document-agent"],
                   dependencies=[Depends(require_internal_deployment)], route_class=DraftRoute)


@router.post("", response_model=DraftResponse, status_code=201)
async def create_draft(request: DraftRequest, service=Depends(get_service)):
    try:
        return await service.generate(request)
    except DraftError as exc:
        raise HTTPException(exc.status, detail=exc.as_dict()) from None


@router.get("/{draft_id}/file")
def download_draft(draft_id: UUID, settings=Depends(get_settings), store=Depends(get_store)):
    try:
        record = store.get(draft_id)
        path = settings.download_path(record)
        return FileResponse(path, filename=record.response.file_name, media_type="application/hwp+zip")
    except DraftError as exc:
        raise HTTPException(exc.status, detail=exc.as_dict()) from None
