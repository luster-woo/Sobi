from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from .errors import BatchError
from .models import BatchState


class InMemoryBatchStore:
    """Short synchronous critical sections only; no I/O under the mutex."""

    def __init__(self, max_history=50):
        if max_history < 1:
            raise ValueError("max_history must be positive")
        self._mutex = Lock()
        self._batches = {}
        self._active = None
        self._claimed = False
        self.max_history = max_history

    def create(self):
        with self._mutex:
            if self._active is not None:
                raise BatchError("BATCH_ALREADY_RUNNING")
            while len(self._batches) >= self.max_history:
                del self._batches[next(iter(self._batches))]
            state = BatchState(batch_id=str(uuid4()), status="RUNNING", started_at=datetime.now(timezone.utc))
            self._batches[state.batch_id] = state
            self._active, self._claimed = state.batch_id, False
            return state.model_copy(deep=True)

    def claim(self, batch_id):
        with self._mutex:
            if self._active != batch_id or self._claimed:
                raise BatchError("BATCH_NOT_RUNNABLE")
            self._claimed = True

    def get(self, batch_id):
        with self._mutex:
            if batch_id not in self._batches:
                raise BatchError("BATCH_NOT_FOUND")
            return self._batches[batch_id].model_copy(deep=True)

    def set_total(self, batch_id, total):
        with self._mutex:
            self._batches[batch_id].total = total

    def add_item(self, batch_id, item):
        with self._mutex:
            state = self._batches[batch_id]
            state.items.append(item.model_copy(deep=True))
            field = {"COMPLETED": "completed", "FAILED": "failed", "SKIPPED": "skipped"}[item.status]
            setattr(state, field, getattr(state, field) + 1)
            state.processed = state.completed + state.failed + state.skipped

    def finish(self, batch_id, error_code=None):
        with self._mutex:
            state = self._batches[batch_id]
            state.status = "FAILED" if error_code else "COMPLETED"
            state.error_code = error_code
            state.finished_at = datetime.now(timezone.utc)

    def release(self, batch_id):
        with self._mutex:
            if self._active == batch_id:
                self._active, self._claimed = None, False
