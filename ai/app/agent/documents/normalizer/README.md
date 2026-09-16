# Document Normalizer

문서 작성 Agent의 형식 정규화 기반. 본문 분석, 필드 추출, Parser, LLM,
문서 작성/내용 검증, DB 연결은 하지 않는다.

## 정책

| 원본 | 결과 | converted |
|---|---|---|
| HWP | HWPX | true |
| HWPX | HWPX 복사본 | false |
| DOC | DOCX | true |
| DOCX | DOCX 복사본 | false |

확장자 대소문자를 구분하지 않는다. 입력은 존재하는 일반 파일이어야 한다.
파일 확장자가 실제 내부 포맷과 일치하는지, 변환 문서의 의미/레이아웃이 보존됐는지는
이 모듈에서 검사하지 않는다. 외부 converter 자체의 검사는 별개다.

## 구조

| 파일 | 역할 |
|---|---|
| ../__init__.py | documents 패키지 |
| __init__.py | 서비스·결과·Enum·오류 공개 |
| enums.py | HWP/HWPX/DOC/DOCX |
| models.py | Pydantic NormalizationResult |
| errors.py | 고정된 안전한 오류 계약 |
| base.py | Normalizer Protocol |
| process.py | 의존성 확인, shell 없는 실행, timeout 종료, 출력 존재 확인 |
| hwp.py | hwp2hwpx CLI Adapter |
| doc.py | LibreOffice headless Adapter |
| passthrough.py | HWPX/DOCX 파일 복사 |
| service.py | 입력 검사, 작업 분리, Adapter 선택, 결과 저장 |
| README.md / INSTALL.md | 사용법 / 별도 설치·통합 검증 가이드 |
| ../../../../tests/test_document_normalizer.py | 외부 도구 없는 단위 테스트 |

DocumentNormalizerService → 확장자 → HwpNormalizer / DocNormalizer / PassThroughNormalizer
→ NormalizationResult.

HWP는 Python 배포 패키지 kossembly-dot/hwp2hwpx의 CLI를 감싼다.
이 패키지는 neolord0/hwp2hwpx Java 변환기를 번들한다. 직접 변환 코드를 구현하지 않는다.
DOC는 soffice의 --headless --convert-to docx를 사용한다.
세부 실행/설치 근거는 INSTALL.md를 참고한다.

## 호출

```python
from app.agent.documents.normalizer import DocumentNormalizerService, NormalizationError

normalizer = DocumentNormalizerService()
try:
    result = normalizer.normalize(
        source_path=source_path,
        output_directory=output_directory,
    )
    payload = result.model_dump(mode="json")
except NormalizationError as exc:
    payload = {"error": exc.as_dict()}
```

- source_path와 output_directory는 호출자가 제공한다.
- 반환 경로는 절대 경로이며 내부 Agent/Parser용이다.
  사용자에게 내부 경로를 보여줄 필요가 없으면 API 경계에서 파일 ID 등으로 변환한다.
- normalize는 동기 메서드다. FastAPI async 호출부에서는 다음처럼 스레드풀을 사용한다.
  이번 작업에서는 main.py나 API 라우터를 추가/변경하지 않았다.

```python
from fastapi.concurrency import run_in_threadpool

result = await run_in_threadpool(
    normalizer.normalize, source_path, output_directory
)
```

실행 파일 경로와 프로세스 제한시간은 생성자로 주입할 수 있다.

```python
from app.agent.documents.normalizer.hwp import HwpNormalizer
from app.agent.documents.normalizer.doc import DocNormalizer

normalizer = DocumentNormalizerService(
    hwp=HwpNormalizer(command=hwp2hwpx_executable, timeout=90),
    doc=DocNormalizer(command=soffice_executable, timeout=90),
)
```

command는 실행 파일 한 개의 경로/이름이다. 셸 명령 문자열을 전달하지 않는다.
기본값은 PATH의 hwp2hwpx / soffice, 각 프로세스 제한시간은 120초다.
이 값은 외부 프로세스 대기 제한이며 파일 복사와 전체 요청 시간을 제한하는 값은 아니다.
hwp2hwpx CLI 내부에도 자체 제한시간이 있으므로 외부 값을 늘려도 내부 제한이 늘지는 않는다.

## 파일 보존과 충돌

1. output_directory 아래에 호출별 임시 디렉터리를 생성한다.
2. 원본을 임시 source.hwp/source.doc 등에 복사한다.
3. 외부 프로그램은 이 복사본만 받는다. 원본 경로는 전달하지 않는다.
4. Adapter 결과가 작업 폴더 내 일반 파일인지 확인한다.
   변환 결과는 파일 존재와 0보다 큰 크기까지 확인한다.
5. output_directory에 normalized-<random>.hwpx 또는 .docx를 배타적으로 생성하고 복사한다.
6. 임시 작업 폴더는 정리하고 결과 경로를 반환한다.

기존 파일의 overwrite, 역변환, 기존 결과 재사용은 하지 않는다.
같은 입력을 다시 처리하거나 동시에 처리하면 각각 다른 출력 경로가 생긴다.
HWPX/DOCX도 독립된 복사본이며 hard link가 아니다.
output_directory가 원본 폴더와 같아도 고유 파일명을 사용한다.
결과 파일 복사 중 오류가 발생하면 이 호출이 생성한 부분 파일을 제거한다.
출력 파일명은 원본명과 다르므로 항상 반환된 normalized_path를 사용한다.

## 의존성·오류

import/생성 시 외부 도구를 실행하거나 설치하지 않는다.
HWP 요청에만 hwp2hwpx·java를 확인하고, DOC 요청에만 soffice를 확인한다.
HWPX/DOCX 복사에는 외부 도구가 필요 없다.

| code | 상황 |
|---|---|
| UNSUPPORTED_FORMAT | 허용 확장자 이외 |
| SOURCE_NOT_FOUND / SOURCE_NOT_FILE | 원본 부재 / 일반 파일 아님 |
| INVALID_PATH / INVALID_OUTPUT_DIRECTORY | 잘못된 경로 / 출력이 디렉터리 아님 |
| DEPENDENCY_MISSING | 실행 파일 부재; 사전 검사 시 dependency로 도구 구분 |
| CONVERTER_START_FAILED | 프로그램 실행 권한 등 시작 실패 |
| CONVERTER_FAILED | 종료 코드가 0이 아님 |
| CONVERTER_TIMEOUT | 실행 제한시간 초과 |
| OUTPUT_NOT_CREATED | 성공 종료 후에도 출력 없음, 비어 있는 변환 파일 등 |
| FILE_IO_ERROR | 파일 읽기/쓰기 오류 |
| NORMALIZATION_FAILED | 그 밖의 내부 실패 |

dependency는 hwp2hwpx, java, libreoffice 중 하나다.
검사 직후 실행 파일이 사라지는 경우에도 DEPENDENCY_MISSING으로 처리하지만
이 경우 dependency 필드는 없을 수 있다.

외부 응답에는 as_dict()의 고정 코드·메시지만 사용한다.
원래 예외, traceback, subprocess stderr/stdout은 외부로 전달하지 않는다.
외부 프로세스 stdout/stderr는 DEVNULL로 버려 메모리 누적도 방지한다.
내부 실패 로그에는 입력 경로, 단계, 알려진 종료 코드가 기록된다.
시작 전 실패의 종료 코드는 None이다. HWP 종료 코드는 hwp2hwpx CLI의 종료 코드다.

LibreOffice는 요청별 UserInstallation 디렉터리로 프로필 충돌을 방지한다.
Linux timeout에서는 프로세스 그룹에 SIGKILL을 보내 Java/LibreOffice 자식도 종료한다.
Windows는 taskkill /T /F를 사용하고 실패 시 직접 프로세스 종료를 시도한다.
timeout 이후 종료/회수에도 별도 5초 단위 상한을 사용한다.

## 테스트 / 범위

```powershell
# ai 디렉터리
python -B -m unittest discover -s tests -p test_document_normalizer.py -v
```

외부 변환 도구나 실제 문서 없이 Adapter/subprocess를 mock한다.
따라서 문서 변환 품질이나 EC2 실행 성공을 보장하는 테스트는 아니다.
실제 파일 통합 검증 절차는 INSTALL.md에 분리했다.

문서 작성 대상은 존재하는 program_document 중 type = '작성용'인 문서로 제한한다.
향후 DocumentTemplate/Agent 진입점에서 검사하며, Normalizer는 이 도메인 검사를 수행하지 않는다.
'제출용', 기타 타입, loan_document는 Agent 작성 대상이 아니다.

Dockerfile에 Java Runtime, LibreOffice Writer, Nanum 폰트를 설치하도록 구성하고,
requirements.txt에 hwp2hwpx==1.0.1을 추가했다. 실제 Docker 빌드/설치는 별도 실행한다.
Normalizer 구현과 RAG, 공고 parser, 임베딩, core, main.py, DB migration은 변경하지 않았다.

