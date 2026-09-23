from threading import Lock
from uuid import UUID

from .errors import DraftError
from .models import DraftRecord


class InMemoryDraftStore:
    def __init__(self):
        self._records: dict[UUID, DraftRecord] = {}
        self._lock = Lock()

    def put(self, record: DraftRecord):
        with self._lock:
            if record.response.draft_id in self._records:
                raise DraftError("DRAFT_ALREADY_EXISTS", 409)
            self._records[record.response.draft_id] = record

    def get(self, draft_id: UUID) -> DraftRecord:
        with self._lock:
            record = self._records.get(draft_id)
            if record is None:
                raise DraftError("DRAFT_NOT_FOUND", 404)
            return record
