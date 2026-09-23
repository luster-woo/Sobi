# 원본 신청서 다운로드

## API와 범위

`GET /api/v1/program-documents/{programDocumentId}/download`

기존 JWT 인증을 사용한다. 요청 body는 없다. 지원사업 ProgramDocument의 ID를 받으며,
별도 테이블인 LoanDocument의 ID를 이 API에 전달하지 않는다. 대출 원본 다운로드는 별도 ID/API 계약이 필요하다.
초안 작성과 달리 작성용 여부나 COMPLETED template 여부를 검사하지 않고 등록된 원본 파일을 제공한다.

- 성공: HTTP 200, Resource binary, Content-Type, Content-Length,
  UTF-8 Content-Disposition attachment (`filename*`), 브라우저용 Content-Disposition 노출 헤더.
- 실패: 기존 BusinessException → GlobalExceptionHandler → ApiResponse JSON.
- 새 인증 체계, DB schema/Repository 변경, FastAPI 호출, 파일 생성·수정·삭제는 없다.

## 원본 파일 조회 규칙

ProgramDocument가 DB에 존재하는지 확인한 뒤 **{original-dir}/{programDocumentId}/**의
직접 하위 일반 파일 하나를 찾는다. 예: `/data/document-agent/original/12/신청서.hwpx`.
ProgramDocument.url은 사용하지 않으므로 NULL이어도 된다. DB 경로 등록/수정은 필요 없다.
하위 폴더를 재귀 탐색하거나 다른 ID 폴더를 검색하지 않는다.
파일이 없으면 404, 두 개 이상이면 저장 규칙 위반으로 500을 반환하며 임의로 선택하지 않는다.

ProgramDocument.docName은 표시 파일명이다. 비어 있으면 실제 경로의 파일명을 사용한다.
표시명에 원본 확장자가 없으면 확장자를 붙이며 제어 문자와 경로 구분자를 `_`로 치환한다.

## 보안 및 오류

양수 Long ID로 폴더명을 생성하고 normalize 후 루트 포함 여부와 toRealPath 후 실제 경로를 확인한다.
DB url을 경로 입력으로 사용하지 않는다. ID 폴더 및 직접 하위 항목의 심볼릭 링크는 거부한다.
루트 내 일반 파일인지 확인하고 Resource stream을 미리 열어 읽기 권한/접근 오류를 확인한다.
파일 내용 전체를 메모리에 적재하지 않는다. 경로와 원문 I/O 예외를 클라이언트에 전달하지 않는다.

| 상황 | ErrorCode | HTTP |
|---|---|---|
| DB 문서 없음 | PROGRAM_DOCUMENT_NOT_FOUND (기존 DOCUMENT_001) | 404 |
| ID 폴더 없음/폴더 아님, 직접 하위 일반 파일 없음 | DOCUMENT_FILE_NOT_FOUND (DOCUMENT_007) | 404 |
| 올바르지 않은 경로 | INVALID_DOCUMENT_PATH (DOCUMENT_008) | 400 |
| 복수 파일, 폴더 목록/파일/Resource 읽기 실패 | DOCUMENT_FILE_READ_FAILED (DOCUMENT_009) | 500 |

probeContentType을 먼저 사용하고 감지 실패·generic ZIP/octet-stream이면 확장자로 fallback한다.
PDF/application/pdf, DOCX/application/vnd.openxmlformats-officedocument.wordprocessingml.document,
HWP/application/x-hwp, HWPX/application/vnd.hancom.hwpx를 제공한다.
감지되지 않는 다른 형식은 application/octet-stream이다. 확장자는 대소문자 무관하다.

Resource는 응답 전 검증 후 HTTP 전송 시 다시 열린다. 전송 도중 파일이 삭제되거나 읽기 장애가 발생하면
이미 전송된 binary 응답을 JSON 오류로 바꿀 수 없다. 운영 원본 폴더는 신뢰된 배포 프로세스만 쓰도록 관리한다.

## 설정 / Docker

application.yaml:

```yaml
document:
  storage:
    original-dir: ${DOCUMENT_ORIGINAL_DIR:/data/document-agent/original}
```

Compose의 **backend** 서비스에 다음 항목을 기존 environment/volumes에 합친다.

```yaml
services:
  backend:
    environment:
      DOCUMENT_ORIGINAL_DIR: /data/document-agent/original
    volumes:
      - /home/ubuntu/app/documents/original:/data/document-agent/original:ro
```

EC2 폴더에 원본을 준비하고 컨테이너 실행 사용자에게 읽기 권한을 준다.
Dockerfile/Compose 파일은 이번 작업에서 수정하지 않았다. application-prod 별도 파일은 현재 없으며
기존 application.yaml 설정을 사용한다.

## 테스트

```powershell
.\gradlew.bat test --tests "com.sobi.document.*"
```

Java 21, 기존 Gradle 캐시로 실행: BUILD SUCCESSFUL.

- 다운로드: 38개 중 36개 통과, 심볼릭 링크 생성 권한이 없는 Windows에서 2개 skip.
- 기존 문서 초안 작성: 37개 모두 통과.
- 합계: 75개 중 73개 통과, 2개 skip, 실패 0.
- 임시 파일과 mock Repository 사용. 실제 운영 DB/FastAPI/EC2 볼륨 호출 없음.
- Linux에서 심볼릭 링크 테스트를 포함한 재실행과 실제 볼륨 수동 검증 필요.
- 전체 Spring 테스트는 이번 작업에서 실행하지 않았다.

검증 내용: ID 폴더 단일 파일, NULL/기존 url 무시, 원본 불변성, 한글/표시명 fallback, 헤더 주입 문자 정리,
DB/폴더/파일 누락, 복수 파일 거부, 재귀 탐색 금지, 다른 ID 파일 미선택, MIME fallback,
Resource 열기 실패, binary 및 UTF-8 헤더, Content-Length, 기존 JWT/JSON 오류 처리.

DB id=12가 존재하고 EC2 `/home/ubuntu/app/documents/original/12/`에 파일 하나를 준비한 뒤 실행한다:

```powershell
curl.exe --fail-with-body `
  "http://localhost:8080/api/v1/program-documents/12/download" `
  -H "Authorization: Bearer $env:SOBI_ACCESS_TOKEN" `
  -D original-headers.txt -o original.hwpx
```

실제 확장자에 맞게 출력 파일명을 바꾼다. 응답 헤더와 원본/다운로드 파일 해시를 비교한다.
오류 응답은 JSON이므로 실패한 출력 파일을 문서로 열지 않는다.

## 이번 작업 파일

생성:

- src/main/java/com/sobi/document/download/controller/ProgramDocumentDownloadController.java
- src/main/java/com/sobi/document/download/service/ProgramDocumentDownloadService.java
- src/main/java/com/sobi/document/download/service/ProgramDocumentDownloadServiceImpl.java
- src/main/java/com/sobi/document/download/dto/DocumentDownload.java
- src/test/java/com/sobi/document/download/controller/ProgramDocumentDownloadControllerTest.java
- src/test/java/com/sobi/document/download/service/ProgramDocumentDownloadServiceTest.java
- docs/program-document-download-api.md

수정:

- src/main/resources/application.yaml: 원본 저장 경로 설정.
- src/main/java/com/sobi/global/exception/ErrorCode.java: DOCUMENT_007~009 추가.

삭제: 없음. 기존 팀원 코드/Entity/Repository/초안 작성 기능/공통 예외 처리기는 수정하지 않았다.

### ID 폴더 규칙 반영 시 수정한 파일

- ProgramDocumentDownloadServiceImpl.java: url 대신 ID 폴더에서 단일 파일 조회.
- ProgramDocumentDownloadServiceTest.java: ID 폴더 규칙/복수 파일/폴더 접근 오류 등 검증.
- 이 문서: 파일 저장 규칙과 테스트 결과 갱신.

이 보완에서 추가·삭제한 파일, DB/환경변수/Controller/ErrorCode 변경은 없다.
