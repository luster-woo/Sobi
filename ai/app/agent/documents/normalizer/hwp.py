"""hwp2hwpx CLI Adapter. Java 변환 로직을 Python으로 재구현하지 않는다."""

from pathlib import Path

from .process import ProcessRunner, SubprocessRunner, executable, require_output, validate_timeout


class HwpNormalizer:
    def __init__(
        self, *, command: str = "hwp2hwpx", timeout: float = 120,
        runner: ProcessRunner | None = None,
    ):
        validate_timeout(timeout)
        self.command = command
        self.timeout = timeout
        self.runner = runner if runner is not None else SubprocessRunner()

    def normalize(self, source: Path, output_directory: Path) -> Path:
        command = executable(self.command, dependency="hwp2hwpx")
        executable("java", dependency="java")
        self.runner.run(
            [command, str(source), "-o", str(output_directory)],
            timeout=self.timeout, stage="hwp_convert",
        )
        return require_output(output_directory / (source.stem + ".hwpx"), stage="hwp_output")
