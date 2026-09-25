"""OCR 엔진: 전용 스레드 · 가속 추론 실패 시 재시도. PaddleOCR 대신 가짜 엔진을 끼워 실행한다."""

import threading
import unittest
from unittest.mock import patch

from app.ocr import engine


class FakeOCR:
    def __init__(self, mkldnn, fail=False):
        self.mkldnn = mkldnn
        self.fail = fail
        self.calls = 0
        self.created_on = threading.current_thread().name

    def predict(self, image):
        self.calls += 1
        if self.fail:
            raise RuntimeError("std::exception")
        return [{"rec_texts": ["mkldnn" if self.mkldnn else "fallback"]}]


class EngineTest(unittest.TestCase):
    def setUp(self):
        engine._ocr = None
        engine._fallback = None
        self.created = []

    def tearDown(self):
        engine._ocr = None
        engine._fallback = None

    def factory(self, fail_first_primary=False):
        """_create 대역. fail_first_primary 면 처음 만든 가속 엔진만 추론이 깨진다"""
        def create(mkldnn):
            primaries = [o for o in self.created if o.mkldnn]
            ocr = FakeOCR(mkldnn, fail=mkldnn and fail_first_primary and not primaries)
            self.created.append(ocr)
            return ocr
        return create

    def test_load_builds_engine_on_ocr_thread(self):
        with patch.object(engine, "_create", side_effect=self.factory()):
            engine.load()
        self.assertTrue(self.created[0].created_on.startswith("ocr"))
        self.assertTrue(engine.is_loaded())

    def test_predict_uses_accelerated_engine(self):
        with patch.object(engine, "MKLDNN", True), patch.object(engine, "_create", side_effect=self.factory()):
            result = engine.predict("image")
        self.assertEqual(result[0]["rec_texts"], ["mkldnn"])
        self.assertIsNone(engine._fallback)

    def test_runtime_error_retries_without_mkldnn(self):
        with patch.object(engine, "MKLDNN", True), \
                patch.object(engine, "_create", side_effect=self.factory(fail_first_primary=True)), \
                self.assertLogs(engine.logger, "ERROR"):
            result = engine.predict("image")

        self.assertEqual(result[0]["rec_texts"], ["fallback"])
        # 깨진 가속 엔진은 버려서, 다음 요청이 새로 만든다
        self.assertIsNone(engine._ocr)
        self.assertTrue(engine.is_loaded())

    def test_next_request_rebuilds_accelerated_engine(self):
        with patch.object(engine, "MKLDNN", True), \
                patch.object(engine, "_create", side_effect=self.factory(fail_first_primary=True)), \
                self.assertLogs(engine.logger, "ERROR"):
            engine.predict("image")
            result = engine.predict("image")

        self.assertEqual(result[0]["rec_texts"], ["mkldnn"])
        self.assertEqual([o.mkldnn for o in self.created], [True, False, True])

    def test_runtime_error_is_raised_when_mkldnn_off(self):
        with patch.object(engine, "MKLDNN", False), \
                patch.object(engine, "_create", side_effect=lambda mkldnn: FakeOCR(mkldnn, fail=True)):
            with self.assertRaises(RuntimeError):
                engine.predict("image")
        self.assertIsNone(engine._fallback)


if __name__ == "__main__":
    unittest.main()
