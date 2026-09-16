# Docker 문서 변환 환경과 통합 검증

## 이미지 구성

기존 python:3.11-slim 이미지를 유지한다. Dockerfile에서 --no-install-recommends로
default-jre-headless, libreoffice-writer, fonts-nanum을 설치하고 apt 목록을 정리한다.
requirements.txt에는 hwp2hwpx==1.0.1을 고정했다. CPU 전용 PyTorch 설치 정책은 유지한다.
문서 변환 프로그램은 컨테이너 내부에서 실행한다. EC2 호스트에 LibreOffice를 별도로 설치하지 않는다.
애플리케이션 import/시작 시 자동 설치는 하지 않는다.

## CLI 호환성

[hwp2hwpx pyproject.toml](https://github.com/kossembly-dot/hwp2hwpx/blob/main/pyproject.toml)의
project.scripts에는 hwp2hwpx = "hwp2hwpx.cli:main"이 정의되어 있고 Python >=3.8을 지원한다.
[1.0.1 배포 설명](https://pypi.org/project/hwp2hwpx/1.0.1/)의 CLI는
hwp2hwpx INPUT -o DIRECTORY 형식이다. 현재 HwpNormalizer 호출과 일치한다.
Python 패키지는 neolord0/hwp2hwpx 기반 Java 변환기를 포함한다.

- HWP: FastAPI/Python → hwp2hwpx CLI → Java → HWPX.
- DOC: FastAPI/Python → soffice --headless → DOCX.
- 기존 timeout, 프로세스 격리, 원본 복사, 결과 파일 확인은 유지한다.
- HWPX/DOCX는 외부 도구 없이 복사한다.

CLI entry point와 문법은 배포 메타데이터/소스로 확인했으며,
실제 이미지 빌드 및 CLI 실행은 이번 작업에서 수행하지 않았다.

## 빌드 후 실행할 확인 명령

다음 명령은 사용자가 별도로 실행한다. 저장소 루트 기준:

```bash
docker build -t sobi-ai:document-normalizer ./ai
docker run --rm --entrypoint java sobi-ai:document-normalizer -version
docker run --rm --entrypoint hwp2hwpx sobi-ai:document-normalizer --help
docker run --rm --entrypoint soffice sobi-ai:document-normalizer --version
```

entrypoint를 지정하므로 FastAPI/DB 연결/임베딩 모델 로드 없이 변환 도구만 확인한다.
Nanum 글꼴 파일은 다음과 같이 확인할 수 있다.

```bash
docker run --rm --entrypoint dpkg sobi-ai:document-normalizer -L fonts-nanum
```

## 실제 파일 통합 검증 (별도 수행)

개인정보 없는 HWP/DOC/HWPX/DOCX 샘플을 테스트용 볼륨에 준비하고, 컨테이너 안에서
Normalizer를 호출한다. 경로는 source_path/output_directory로 전달한다.
컨테이너 실행 계정에는 출력 폴더 및 임시 파일/프로필 생성 권한이 있어야 한다.

1. 원본 SHA-256 기록 후 변환 전후 동일 여부 확인.
2. 한글/공백/대문자 확장자와 네 형식의 출력 경로/converted 값 확인.
3. 생성된 HWPX/DOCX가 대상 편집기에서 열리는지 확인.
4. 표, 병합 셀, 이미지, 글꼴, 머리말/꼬리말, 페이지 구분과 스타일 보존 비교.
5. 손상/암호화/미지원 문서의 실패 처리 확인.
6. 같은 문서 반복/동시 변환의 고유 결과 경로와 LibreOffice 프로필 분리 확인.
7. timeout 시 컨테이너 내부 Python CLI/Java/soffice 자식 프로세스 종료 확인.
8. EC2 아키텍처, Java/LibreOffice 버전, 메모리와 변환 시간을 기록.

문서 내용/레이아웃 품질은 단위 테스트에서 검증하지 않는다.
Normalizer는 program_document.type을 검사하지 않는다. 향후 Agent 진입점에서
program_document 존재와 type = '작성용'을 확인한 뒤 호출해야 한다.
강제 종료 시 upstream 변환기가 만든 시스템 임시 폴더가 남을 수 있어 정리 정책도 확인한다.
