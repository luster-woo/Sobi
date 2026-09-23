"""LibreOffice headless Adapter. 매 호출마다 독립된 프로필을 사용한다."""

from pathlib import Path

from .process import ProcessRunner, SubprocessRunner, executable, require_output, validate_timeout


class DocNormalizer:
    def __init__(
        self, *, command: str = "soffice", timeout: float = 120,
        runner: ProcessRunner | None = None,
    ):
        validate_timeout(timeout)
        self.command = command
        self.timeout = timeout
        self.runner = runner if runner is not None else SubprocessRunner()

    def normalize(self, source: Path, output_directory: Path) -> Path:
        command = executable(self.command, dependency="libreoffice")
        profile = (output_directory / "lo-profile").resolve().as_uri()
        self.runner.run(
            [
                command, f"-env:UserInstallation={profile}", "--headless",
                "--nologo", "--nodefault", "--norestore",
                "--convert-to", "docx", "--outdir", str(output_directory), str(source),
            ],
            timeout=self.timeout, stage="doc_convert",
        )
        return require_output(output_directory / (source.stem + ".docx"), stage="doc_output")
