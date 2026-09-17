import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
from fastapi import FastAPI

from app.agent.documents.preprocessing_batch import BatchPreprocessingService
from app.agent.documents.preprocessing_batch.config import BatchSettings
from app.agent.documents.preprocessing_batch.router import router, get_service, get_store, require_internal_deployment


class BatchApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        original = root / "original"
        original.mkdir()
        self.repository = SimpleNamespace(list_documents=AsyncMock(return_value=[]))
        self.service = BatchPreprocessingService(settings=BatchSettings(original, root / "normalized"),
            repository=self.repository, preprocessor=SimpleNamespace(preprocess=AsyncMock()))
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_service] = lambda: self.service
        self.app.dependency_overrides[get_store] = lambda: self.service.store
        self.app.dependency_overrides[require_internal_deployment] = lambda: None
        self.url = "/api/v1/document-agent/preprocessing/batches"

    async def request(self, method, url, **kwargs):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test") as client:
            return await client.request(method, url, **kwargs)

    async def test_post_and_get(self):
        response = await self.request("POST", self.url, json={})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "RUNNING")
        saved = await self.request("GET", self.url + "/" + response.json()["batchId"])
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["status"], "COMPLETED")
        self.assertEqual(saved.json()["processed"], 0)
        self.assertIsNotNone(saved.json()["finishedAt"])

    async def test_missing_id(self):
        response = await self.request("GET", self.url + "/" + str(uuid4()))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["code"], "BATCH_NOT_FOUND")

    async def test_duplicate_post(self):
        self.service.start()
        response = await self.request("POST", self.url, json={})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"]["code"], "BATCH_ALREADY_RUNNING")

    async def test_body_paths_rejected(self):
        response = await self.request("POST", self.url, json={"source_root": "/elsewhere"})
        self.assertEqual(response.status_code, 422)

    async def test_strict_options(self):
        response = await self.request("POST", self.url, json={"retry_failed": "false"})
        self.assertEqual(response.status_code, 422)

    async def test_disabled_by_default(self):
        from unittest.mock import patch
        del self.app.dependency_overrides[require_internal_deployment]
        with patch.dict("os.environ", {"DOCUMENT_AGENT_BATCH_API_ENABLED": "false"}):
            response = await self.request("POST", self.url, json={})
        self.assertEqual(response.status_code, 503)

    async def test_response_sent_before_background_finishes(self):
        # ASGITransport waits for BackgroundTasks; inspect actual ASGI send events instead.
        entered, release, response_sent = asyncio.Event(), asyncio.Event(), asyncio.Event()
        async def list_documents():
            entered.set()
            await release.wait()
            return []
        self.repository.list_documents.side_effect = list_documents
        messages = []
        async def send(message):
            messages.append(message)
            if message["type"] == "http.response.body" and not message.get("more_body", False):
                response_sent.set()
        async def receive():
            return {"type": "http.request", "body": b"{}", "more_body": False}
        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST",
                 "scheme": "http", "path": self.url, "raw_path": self.url.encode(), "query_string": b"",
                 "root_path": "", "headers": [(b"content-type", b"application/json")],
                 "client": ("127.0.0.1", 1), "server": ("test", 80)}
        task = asyncio.create_task(self.app(scope, receive, send))
        try:
            await asyncio.wait_for(response_sent.wait(), 2)
            await asyncio.wait_for(entered.wait(), 2)
            self.assertFalse(task.done())
            self.assertEqual(messages[0]["status"], 202)
            payload = json.loads(next(m["body"] for m in messages if m["type"] == "http.response.body"))
            current = await self.request("GET", self.url + "/" + payload["batchId"])
            self.assertEqual(current.json()["status"], "RUNNING")
        finally:
            release.set()
            await task
