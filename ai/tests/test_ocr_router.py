"""/ocr/verify 요청 검사·에러 응답·한 장씩 처리. 검증 본체(service.verify)는 가짜로 바꿔 실행한다.
python-multipart 가 필요하다 (requirements.txt)."""

import asyncio
import json
import time
import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ocr import router as ocr_router
from app.ocr import service
from app.ocr.schemas import VerifyResponse

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
EXPECTED = json.dumps({"brn": "345-67-89012", "owner_name": "권병수", "open_date": "2023-01-10"}, ensure_ascii=False)


def make_app():
    app = FastAPI()
    app.include_router(ocr_router.router)
    return app


def passed(*args, **kwargs):
    return VerifyResponse(status="PASSED", confidence=0.9)


class RouterTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(make_app())

    def post(self, filename="a.png", content=PNG, document_name="사업자등록증명원", expected=EXPECTED):
        files = {"file": (filename, content, "application/octet-stream")} if filename else None
        data = {k: v for k, v in {"document_name": document_name, "expected": expected}.items() if v is not None}
        return self.client.post("/ocr/verify", files=files, data=data)

    def test_valid_request_passes_parsed_values_to_service(self):
        with patch.object(service, "verify", side_effect=passed) as verify:
            r = self.post()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "PASSED")
        data, ext, name, expected = verify.call_args.args
        self.assertEqual((ext, name, expected.owner_name, expected.open_date.isoformat()),
                         (".png", "사업자등록증명원", "권병수", "2023-01-10"))

    def test_rejects_unsupported_extension(self):
        r = self.post(filename="a.txt")
        self.assertEqual((r.status_code, r.json()["detail"]), (400, "지원하지 않는 파일 형식입니다"))

    def test_rejects_signature_mismatch_and_empty_file(self):
        self.assertEqual(self.post(filename="a.pdf").json()["detail"], "파일을 열 수 없습니다")
        self.assertEqual(self.post(content=b"").status_code, 400)

    def test_rejects_over_10mb(self):
        self.assertEqual(self.post(content=PNG + b"0" * (10 * 1024 * 1024)).status_code, 413)

    def test_rejects_bad_expected(self):
        for bad in ["not json", "[1]", "null", '{"open_date": "2023-13-99"}']:
            r = self.post(expected=bad)
            self.assertEqual((r.status_code, r.json()["detail"]), (400, "expected 형식이 올바르지 않습니다"), bad)

    def test_missing_fields_are_422(self):
        self.assertEqual(self.post(document_name=None).status_code, 422)
        self.assertEqual(self.post(filename=None).status_code, 422)

    def test_unreadable_file_from_service_is_400(self):
        with patch.object(service, "verify", side_effect=service.FileUnreadableError("broken")):
            r = self.post()
        self.assertEqual((r.status_code, r.json()["detail"]), (400, "파일을 열 수 없습니다"))

    def test_unexpected_error_is_500_with_detail(self):
        with patch.object(service, "verify", side_effect=RuntimeError("boom")):
            r = self.post()
        self.assertEqual(r.status_code, 500)
        self.assertEqual(r.json()["detail"], "OCR 처리 중 오류가 발생했습니다")


class OneAtATimeTest(unittest.TestCase):
    def test_concurrent_requests_are_processed_one_by_one(self):
        async def slow(*args, **kwargs):
            await asyncio.sleep(0.3)
            return passed()

        async def burst():
            transport = httpx.ASGITransport(app=make_app())
            async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
                started = time.perf_counter()
                responses = await asyncio.gather(*[
                    client.post("/ocr/verify", files={"file": ("a.png", PNG)},
                                data={"document_name": "x", "expected": "{}"}) for _ in range(3)])
                return time.perf_counter() - started, responses

        with patch.object(service, "verify", side_effect=slow):
            total, responses = asyncio.run(burst())
        self.assertGreaterEqual(total, 0.85)
        # elapsed_ms 는 대기 시간을 빼고 자기 처리 시간만
        self.assertTrue(all(250 <= r.json()["elapsed_ms"] < 600 for r in responses), [r.json() for r in responses])


if __name__ == "__main__":
    unittest.main()
