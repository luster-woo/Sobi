"""정규화 진입점. 임시 원본 복사 → Adapter → 고유 경로로 결과 복사."""

import logging
import os
from pathlib import Path
import shutil
import tempfile

from .base import Normalizer
from .doc import DocNormalizer
from .enums import DocumentFormat
from .errors import NormalizationError
from .hwp import HwpNormalizer
from .models import NormalizationResult
from .passthrough import PassThroughNormalizer

logger = logging.getLogger(__name__)

TARGET_FORMAT = {
    DocumentFormat.HWP: DocumentFormat.HWPX,
    DocumentFormat.HWPX: DocumentFormat.HWPX,
    DocumentFormat.DOC: DocumentFormat.DOCX,
    DocumentFormat.DOCX: DocumentFormat.DOCX,
}


class DocumentNormalizerService:
    def __init__(
        self, *, hwp: Normalizer | None = None, doc: Normalizer | None = None,
    ):
        self._normalizers = {
            DocumentFormat.HWP: hwp if hwp is not None else HwpNormalizer(),
            DocumentFormat.DOC: doc if doc is not None else DocNormalizer(),
            DocumentFormat.HWPX: PassThroughNormalizer(),
            DocumentFormat.DOCX: PassThroughNormalizer(),
        }

    def normalize(
        self, source_path: str | Path, output_directory: str | Path,
    ) -> NormalizationResult:
        """동기 API. async FastAPI 호출부에서는 run_in_threadpool로 호출한다."""
        stage = "input"
        try:
            source = Path(source_path).expanduser().resolve()
            try:
                original_format = DocumentFormat(source.suffix.lstrip(".").upper())
            except ValueError:
                raise NormalizationError("UNSUPPORTED_FORMAT", stage=stage) from None
            if not source.exists():
                raise NormalizationError("SOURCE_NOT_FOUND", stage=stage)
            if not source.is_file():
                raise NormalizationError("SOURCE_NOT_FILE", stage=stage)

            stage = "output_directory"
            output = Path(output_directory).expanduser().resolve()
            if output.exists() and not output.is_dir():
                raise NormalizationError("INVALID_OUTPUT_DIRECTORY", stage=stage)
            output.mkdir(parents=True, exist_ok=True)
            target_format = TARGET_FORMAT[original_format]
            converted = original_format != target_format

            # 경로는 호출자 output 아래에만 생성. 각 요청은 독립된 임시 디렉터리 사용.
            with tempfile.TemporaryDirectory(prefix=".normalize-", dir=output) as work:
                workspace = Path(work)
                stage = "source_copy"
                source_copy = workspace / ("source." + original_format.value.lower())
                with source.open("rb") as reader, source_copy.open("xb") as writer:
                    shutil.copyfileobj(reader, writer)
                conversion_output = workspace / "result"
                conversion_output.mkdir()
                stage = "convert" if converted else "copy"
                candidate = self._normalizers[original_format].normalize(source_copy, conversion_output)
                stage = "output_check"
                # Adapter가 반환한 경로도 작업 디렉터리 안의 일반 파일이어야 한다.
                if (candidate.is_symlink() or not candidate.is_file()
                        or not candidate.resolve().is_relative_to(conversion_output.resolve())
                        or candidate.suffix.lower() != "." + target_format.value.lower()
                        or (converted and candidate.stat().st_size == 0)):
                    raise NormalizationError("OUTPUT_NOT_CREATED", stage=stage)
                stage = "publish"
                normalized = self._publish(candidate, output, target_format)
            return NormalizationResult(
                original_path=str(source), original_format=original_format,
                normalized_path=str(normalized), normalized_format=target_format, converted=converted,
            )
        except NormalizationError as exc:
            logger.warning(
                "normalization_failed input=%s stage=%s exit_code=%s code=%s",
                source_path, exc.stage, exc.returncode, exc.code,
            )
            raise
        except (ValueError, TypeError):
            logger.warning("normalization_failed input=%s stage=%s code=INVALID_PATH", source_path, stage)
            raise NormalizationError("INVALID_PATH", stage=stage) from None
        except OSError:
            logger.warning("normalization_failed input=%s stage=%s code=FILE_IO_ERROR", source_path, stage)
            raise NormalizationError("FILE_IO_ERROR", stage=stage) from None
        except Exception:
            logger.warning("normalization_failed input=%s stage=%s code=NORMALIZATION_FAILED", source_path, stage)
            raise NormalizationError("NORMALIZATION_FAILED", stage=stage) from None

    @staticmethod
    def _publish(candidate: Path, output: Path, target_format: DocumentFormat) -> Path:
        # mkstemp의 배타적 생성으로 중복/동시 실행 및 기존 파일 충돌을 방지한다.
        fd, name = tempfile.mkstemp(prefix="normalized-", suffix="." + target_format.value.lower(), dir=output)
        target = Path(name)
        try:
            with os.fdopen(fd, "wb") as writer, candidate.open("rb") as reader:
                shutil.copyfileobj(reader, writer)
        except BaseException:
            target.unlink(missing_ok=True)
            raise
        return target

