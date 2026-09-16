"""지연 의존성 확인과 shell 없는 제한시간 프로세스 실행."""

import math
import os
from pathlib import Path
import shutil
import signal
import subprocess
from typing import Protocol

from .errors import NormalizationError


class ProcessRunner(Protocol):
    def run(self, args: list[str], *, timeout: float, stage: str) -> None: ...


def executable(name: str, *, dependency: str) -> str:
    found = shutil.which(name)
    if found is None:
        raise NormalizationError("DEPENDENCY_MISSING", stage="dependency", dependency=dependency)
    return found


def validate_timeout(timeout: float) -> None:
    if isinstance(timeout, bool) or not isinstance(timeout, (int, float)):
        raise ValueError("timeout은 양수여야 합니다.")
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError("timeout은 유한한 양수여야 합니다.")


def require_output(path: Path, *, stage: str) -> Path:
    # 형식/본문 검증은 수행하지 않는다. 결과의 존재와 일반 파일/크기만 확인한다.
    if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
        raise NormalizationError("OUTPUT_NOT_CREATED", stage=stage, returncode=0)
    return path


class SubprocessRunner:
    def run(self, args: list[str], *, timeout: float, stage: str) -> None:
        validate_timeout(timeout)
        options = {"start_new_session": True} if os.name == "posix" else {
            "creationflags": subprocess.CREATE_NO_WINDOW,
        }
        try:
            process = subprocess.Popen(
                args, shell=False, stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **options,
            )
        except FileNotFoundError:
            raise NormalizationError("DEPENDENCY_MISSING", stage=stage) from None
        except OSError:
            raise NormalizationError("CONVERTER_START_FAILED", stage=stage) from None
        try:
            returncode = process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            self._terminate(process)
            raise NormalizationError(
                "CONVERTER_TIMEOUT", stage=stage, returncode=process.returncode
            ) from None
        if returncode != 0:
            raise NormalizationError("CONVERTER_FAILED", stage=stage, returncode=returncode)

    @staticmethod
    def _terminate(process) -> None:
        # EC2에서는 Python CLI가 실행한 Java/LibreOffice 자식까지 같은 그룹으로 종료.
        try:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    shell=False, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL, timeout=5,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
        except (OSError, subprocess.TimeoutExpired):
            pass
        if process.poll() is None:
            process.kill()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
