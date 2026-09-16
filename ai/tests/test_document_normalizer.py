"""외부 converter 설치 없이 실행. 문서 형식/내용 검증은 통합 테스트로 분리."""

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from app.agent.documents.normalizer import (
    DocumentFormat as F, DocumentNormalizerService, NormalizationError,
)
from app.agent.documents.normalizer.doc import DocNormalizer
from app.agent.documents.normalizer.hwp import HwpNormalizer
from app.agent.documents.normalizer.process import SubprocessRunner

MODULE = "app.agent.documents.normalizer"
ORIGINAL = b"original document bytes"


class FakeNormalizer:
    def __init__(self, extension, *, error=None, missing=False, empty=False, mutate=False):
        self.extension = extension
        self.error = error
        self.missing = missing
        self.empty = empty
        self.mutate = mutate
        self.calls = []

    def normalize(self, source, output_directory):
        self.calls.append((source, output_directory))
        if self.mutate:
            source.write_bytes(b"converter changed its input")
        if self.error:
            raise self.error
        target = output_directory / ("source." + self.extension)
        if not self.missing:
            target.write_bytes(b"" if self.empty else b"normalized bytes")
        return target


class NormalizerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.output = self.root / "normalized"
        self.hwp = FakeNormalizer("hwpx")
        self.doc = FakeNormalizer("docx")
        self.service = DocumentNormalizerService(hwp=self.hwp, doc=self.doc)

    def source(self, extension):
        source = self.root / ("문서 name." + extension)
        source.write_bytes(ORIGINAL)
        return source

    def assert_error(self, code, function):
        with self.assertRaises(NormalizationError) as caught:
            function()
        self.assertEqual(caught.exception.code, code)
        return caught.exception

    def test_hwp_selects_adapter(self):
        source = self.source("HwP")
        result = self.service.normalize(source, self.output)
        self.assertEqual((result.original_format, result.normalized_format, result.converted),
                         (F.HWP, F.HWPX, True))
        self.assertEqual(len(self.hwp.calls), 1)
        self.assertEqual(self.doc.calls, [])
        self.assertNotEqual(self.hwp.calls[0][0], source)
        self.assertEqual(Path(result.normalized_path).read_bytes(), b"normalized bytes")
        self.assertEqual(result.original_path, str(source.resolve()))

    def test_doc_selects_adapter(self):
        result = self.service.normalize(self.source("DOC"), self.output)
        self.assertEqual((result.original_format, result.normalized_format, result.converted),
                         (F.DOC, F.DOCX, True))
        self.assertEqual(len(self.doc.calls), 1)
        self.assertEqual(self.hwp.calls, [])

    def test_hwpx_copy(self):
        self.assert_copy("hWpX", F.HWPX)

    def test_docx_copy(self):
        self.assert_copy("DoCx", F.DOCX)

    def assert_copy(self, extension, expected):
        source = self.source(extension)
        with patch(MODULE + ".process.subprocess.Popen") as popen:
            result = self.service.normalize(source, self.output)
        popen.assert_not_called()
        self.assertFalse(result.converted)
        self.assertEqual(result.normalized_format, expected)
        target = Path(result.normalized_path)
        self.assertNotEqual(target, source)
        self.assertEqual(target.parent, self.output.resolve())
        self.assertEqual(target.read_bytes(), ORIGINAL)
        target.write_bytes(b"writer changes")
        self.assertEqual(source.read_bytes(), ORIGINAL)

    def test_unsupported_extension(self):
        self.assert_error("UNSUPPORTED_FORMAT",
                          lambda: self.service.normalize(self.source("pdf"), self.output))
        self.assertFalse(self.output.exists())

    def test_nonexistent_source(self):
        self.assert_error("SOURCE_NOT_FOUND",
                          lambda: self.service.normalize(self.root / "absent.hwp", self.output))

    def test_directory_source(self):
        source = self.root / "directory.doc"
        source.mkdir()
        self.assert_error("SOURCE_NOT_FILE", lambda: self.service.normalize(source, self.output))

    def test_output_is_file(self):
        self.output.write_bytes(b"existing")
        self.assert_error("INVALID_OUTPUT_DIRECTORY",
                          lambda: self.service.normalize(self.source("docx"), self.output))
        self.assertEqual(self.output.read_bytes(), b"existing")

    def test_converter_failure_is_safe_and_logged(self):
        self.hwp.error = NormalizationError("CONVERTER_FAILED", stage="hwp_convert", returncode=7)
        self.hwp.mutate = True
        source = self.source("hwp")
        with self.assertLogs(MODULE + ".service", level="WARNING") as logs:
            error = self.assert_error("CONVERTER_FAILED", lambda: self.service.normalize(source, self.output))
        self.assertIn(str(source), logs.output[0])
        self.assertIn("hwp_convert", logs.output[0])
        self.assertIn("exit_code=7", logs.output[0])
        self.assertNotIn(str(source), json.dumps(error.as_dict()))
        self.assertEqual(list(self.output.iterdir()), [])
        self.assertEqual(source.read_bytes(), ORIGINAL)

    def test_unexpected_adapter_exception_is_safe(self):
        self.doc.error = RuntimeError("secret stderr /internal/server/password")
        error = self.assert_error("NORMALIZATION_FAILED",
                                 lambda: self.service.normalize(self.source("doc"), self.output))
        self.assertNotIn("secret", str(error))
        self.assertNotIn("/internal", json.dumps(error.as_dict()))

    def test_adapter_did_not_create_output(self):
        for adapter, extension in ((self.hwp, "hwp"), (self.doc, "doc")):
            adapter.missing = True
            self.assert_error("OUTPUT_NOT_CREATED",
                              lambda: self.service.normalize(self.source(extension), self.output))
        self.assertEqual(list(self.output.iterdir()), [])

    def test_empty_converted_output_rejected(self):
        self.hwp.empty = True
        self.assert_error("OUTPUT_NOT_CREATED",
                          lambda: self.service.normalize(self.source("hwp"), self.output))

    def test_existing_output_and_repeated_processing(self):
        self.output.mkdir()
        existing = self.output / "normalized-existing.docx"
        existing.write_bytes(b"preserve result")
        source = self.source("docx")
        first = self.service.normalize(source, self.output)
        second = self.service.normalize(source, self.output)
        self.assertNotEqual(first.normalized_path, second.normalized_path)
        self.assertEqual(existing.read_bytes(), b"preserve result")
        self.assertEqual(Path(first.normalized_path).read_bytes(), ORIGINAL)

    def test_same_directory_never_overwrites_original(self):
        source = self.source("docx")
        result = self.service.normalize(source, source.parent)
        self.assertNotEqual(Path(result.normalized_path), source)
        self.assertEqual(source.read_bytes(), ORIGINAL)

    def test_parallel_copies_have_unique_paths(self):
        source = self.source("hwpx")
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(lambda _: self.service.normalize(source, self.output), range(8)))
        self.assertEqual(len({r.normalized_path for r in results}), 8)
        self.assertEqual(source.read_bytes(), ORIGINAL)
        self.assertFalse(any(p.is_dir() for p in self.output.iterdir()))

    def test_converter_only_receives_disposable_copy(self):
        for adapter, extension in ((self.hwp, "hwp"), (self.doc, "doc")):
            adapter.mutate = True
            source = self.source(extension)
            self.service.normalize(source, self.output)
            self.assertEqual(source.read_bytes(), ORIGINAL)

    def test_construction_does_not_check_dependencies(self):
        with patch(MODULE + ".process.shutil.which", return_value=None) as which:
            service = DocumentNormalizerService()
            which.assert_not_called()
            result = service.normalize(self.source("docx"), self.output)
            self.assertFalse(result.converted)
            which.assert_not_called()

    def test_missing_hwp_cli(self):
        with patch(MODULE + ".process.shutil.which", return_value=None):
            error = self.assert_error("DEPENDENCY_MISSING", lambda:
                DocumentNormalizerService().normalize(self.source("hwp"), self.output))
        self.assertEqual(error.as_dict()["dependency"], "hwp2hwpx")

    def test_missing_java(self):
        with patch(MODULE + ".process.shutil.which", side_effect=lambda n: None if n == "java" else n):
            error = self.assert_error("DEPENDENCY_MISSING", lambda:
                DocumentNormalizerService().normalize(self.source("hwp"), self.output))
        self.assertEqual(error.as_dict()["dependency"], "java")

    def test_missing_libreoffice(self):
        with patch(MODULE + ".process.shutil.which", return_value=None):
            error = self.assert_error("DEPENDENCY_MISSING", lambda:
                DocumentNormalizerService().normalize(self.source("doc"), self.output))
        self.assertEqual(error.as_dict()["dependency"], "libreoffice")


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.output = self.root / "result"
        self.output.mkdir()
        patcher = patch(MODULE + ".process.shutil.which", side_effect=lambda n: n)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_hwp_cli_arguments(self):
        source = self.root / "source.hwp"
        runner = Mock()
        runner.run.side_effect = lambda *a, **kw: (self.output / "source.hwpx").write_bytes(b"output")
        adapter = HwpNormalizer(command="/tools/hwp2hwpx", runner=runner, timeout=30)
        result = adapter.normalize(source, self.output)
        runner.run.assert_called_once_with(
            ["/tools/hwp2hwpx", str(source), "-o", str(self.output)],
            timeout=30, stage="hwp_convert")
        self.assertTrue(result.is_file())

    def test_doc_arguments_and_isolated_profile(self):
        source = self.root / "source.doc"
        runner = Mock()
        runner.run.side_effect = lambda *a, **kw: (self.output / "source.docx").write_bytes(b"output")
        DocNormalizer(runner=runner, timeout=45).normalize(source, self.output)
        args = runner.run.call_args.args[0]
        self.assertIn("--headless", args)
        self.assertEqual(args[args.index("--convert-to") + 1], "docx")
        self.assertEqual(args[args.index("--outdir") + 1], str(self.output))
        self.assertIn("-env:UserInstallation=" + (self.output / "lo-profile").as_uri(), args)
        self.assertEqual(args[-1], str(source))
        self.assertEqual(runner.run.call_args.kwargs["timeout"], 45)

    def test_zero_exit_without_file_is_failure_for_both_adapters(self):
        for adapter, ext in ((HwpNormalizer(runner=Mock()), "hwp"), (DocNormalizer(runner=Mock()), "doc")):
            with self.subTest(ext=ext), self.assertRaises(NormalizationError) as caught:
                adapter.normalize(self.root / ("source." + ext), self.output)
            self.assertEqual(caught.exception.code, "OUTPUT_NOT_CREATED")
            self.assertEqual(caught.exception.returncode, 0)

    def test_invalid_timeout(self):
        for timeout in (0, -1, float("inf"), float("nan"), True, "120"):
            with self.subTest(timeout=timeout), self.assertRaises(ValueError):
                DocNormalizer(timeout=timeout)


class ProcessTests(unittest.TestCase):
    def test_subprocess_is_shell_free_with_timeout(self):
        process = Mock()
        process.wait.return_value = 0
        with patch(MODULE + ".process.subprocess.Popen", return_value=process) as popen:
            SubprocessRunner().run(["converter", "a; echo secret"], timeout=10, stage="convert")
        self.assertEqual(popen.call_args.args[0], ["converter", "a; echo secret"])
        self.assertIs(popen.call_args.kwargs["shell"], False)
        self.assertEqual(popen.call_args.kwargs["stderr"], subprocess.DEVNULL)
        process.wait.assert_called_once_with(timeout=10)

    def test_nonzero_exit(self):
        process = Mock()
        process.wait.return_value = 2
        with patch(MODULE + ".process.subprocess.Popen", return_value=process):
            with self.assertRaises(NormalizationError) as caught:
                SubprocessRunner().run(["converter"], timeout=10, stage="hwp_convert")
        self.assertEqual(caught.exception.code, "CONVERTER_FAILED")
        self.assertEqual(caught.exception.returncode, 2)

    def test_timeout_terminates_process(self):
        process = Mock(returncode=-9)
        process.wait.side_effect = subprocess.TimeoutExpired("secret command", 10, stderr="private")
        runner = SubprocessRunner()
        with patch(MODULE + ".process.subprocess.Popen", return_value=process), patch.object(runner, "_terminate") as kill:
            with self.assertRaises(NormalizationError) as caught:
                runner.run(["converter"], timeout=10, stage="doc_convert")
        kill.assert_called_once_with(process)
        self.assertEqual(caught.exception.code, "CONVERTER_TIMEOUT")
        self.assertNotIn("private", str(caught.exception))

    def test_missing_executable_at_launch(self):
        with patch(MODULE + ".process.subprocess.Popen", side_effect=FileNotFoundError("private path")):
            with self.assertRaises(NormalizationError) as caught:
                SubprocessRunner().run(["converter"], timeout=10, stage="convert")
        self.assertEqual(caught.exception.code, "DEPENDENCY_MISSING")
        self.assertNotIn("private", str(caught.exception))

    def test_permission_error_at_launch(self):
        with patch(MODULE + ".process.subprocess.Popen", side_effect=PermissionError("private path")):
            with self.assertRaises(NormalizationError) as caught:
                SubprocessRunner().run(["converter"], timeout=10, stage="convert")
        self.assertEqual(caught.exception.code, "CONVERTER_START_FAILED")

    def test_linux_timeout_kills_process_group(self):
        process = Mock(pid=123)
        process.poll.return_value = -9
        platform = SimpleNamespace(name="posix", killpg=Mock())
        with patch(MODULE + ".process.os", platform), patch(
            MODULE + ".process.signal.SIGKILL", 9, create=True
        ):
            SubprocessRunner._terminate(process)
        platform.killpg.assert_called_once()
        self.assertEqual(platform.killpg.call_args.args[0], 123)
        process.wait.assert_called_once_with(timeout=5)


if __name__ == "__main__":
    unittest.main()
