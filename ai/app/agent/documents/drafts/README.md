# Draft Generation Service + FastAPI API

## 목적과 경계

COMPLETED template의 저장된 schema로 초안을 만들고 다운로드한다. 사용자 보고 기준
Batch 137개 중 129개 성공/8개 실패이며 실패 문서는 현재 Draft 지원 대상에서 제외한다.
이 수치는 이번 작업에서 실제 DB로 재조회한 값이 아니다.

```text
POST templateId + userId
→ 기존 RuntimeRepository.load (template + program_document + schema/source snapshot)
→ COMPLETED / 작성용 / normalized HWPX 파일 검증
→ 기존 DocumentAgentRuntime.resolve
→ ready_for_write
→ 기존 HwpxWriter.write (worker thread)
→ 출력 파일 확인 → InMemoryDraftStore 등록 → 201 metadata
GET draftId/file → Store → root confinement → FileResponse
```

Draft는 Source/계산/생성/Writer 기능을 다시 구현하지 않는다. USER_BIRTH_DATE, 반복 USER_NAME/
BUSINESS_NAME, inline_blank, 날짜 formatting 등을 label로 구분하지 않고 기존 Runtime/Writer에 넘긴다.
별도 template SQL도 없다. 기존 RuntimeRepository가 한 REPEATABLE READ 읽기 트랜잭션에서
template/schema/source를 읽고, 요청별 TemplateSnapshot이 같은 복사본을 Runtime에 전달한다.
따라서 Runtime에서 다시 DB를 읽어 다른 template/schema가 섞이는 문제를 피한다.
기존 INNER JOIN상 연결된 program_document가 없으면 TEMPLATE_NOT_FOUND로 처리한다.

## 파일 역할

| 파일 | 역할 |
|---|---|
| __init__.py | 공개 Draft API |
| models.py | camelCase 요청/응답, 내부 메타데이터 |
| service.py | 기존 repository/Runtime/Writer orchestration, 요청별 snapshot adapter |
| settings.py | generated root 설정, 파일 경로 검증 |
| store.py | Lock으로 보호하는 process-local metadata dict |
| router.py | POST/GET 및 feature flag, 요청 오류 입력값 비노출 |
| errors.py | 안전한 오류 코드/HTTP 상태 |

공용 main.py는 router import/include_router 두 줄만 추가했다. 공용 config/dependencies,
Runtime/Writer/Parser/Candidate/Analyzer/Persistence/Batch/Source/RAG/migration은 변경하지 않았다.

## POST /api/v1/document-agent/drafts

```json
{"templateId":15,"userId":2}
```

두 ID는 strict positive integer(bigint 범위)이며 templateId는 **document_template.id**이다.
JSON은 camelCase만 받는다. userInputs/user_inputs, sourcePath/normalizedPath/outputPath,
locationInfo, field values 등 추가 키는 422로 거부한다. 임의 입력값을 오류에 반사하지 않는다.

POST는 한 요청에서 생성이 완료되는 동기 API다(BackgroundTask/job/queue 없음).
비동기 Runtime은 await, blocking Writer와 파일 검사/디렉터리 생성은 asyncio.to_thread로 실행한다.
GENERATED는 기본 Runtime의 기존 lazy GMS adapter를 사용하며 Draft가 직접 GMS를 호출하지 않는다.
기존 timeout/error/RAG UNSUPPORTED 정책을 유지한다. 실제 GMS 비용이 발생할 수 있다.

성공: HTTP 201

```json
{
  "draftId":"61a169fd-6dde-485d-90bf-e54851834812",
  "templateId":15,
  "programDocumentId":76,
  "status":"COMPLETED",
  "fileName":"draft-61a169fd-6dde-485d-90bf-e54851834812.hwpx",
  "writtenFieldCount":14,
  "leftBlankFieldCount":4,
  "unsupportedFieldCount":2
}
```

- writtenFieldCount: **Writer가 반환한 실제 written_count**.
- leftBlankFieldCount/unsupportedFieldCount: Runtime fields의 해당 상태 개수.
- COMPLETED는 초안 파일 생성 완료이며 최종 제출 가능성 판정이 아니다.
- response/store에 실제 field value를 넣지 않는다. store에만 generated path/created_at을 추가 보관한다.
- 로그는 단계/안전한 오류 코드/ID/count만 남기고 값/경로/프롬프트/응답/예외 전문을 남기지 않는다.

## LEFT_BLANK와 오류

USER_INPUT은 입력받지 않고 LEFT_BLANK/value=null로 남아 Writer가 skip한다.
required USER_INPUT도 ready_for_write를 막지 않는다. ready_for_write는 기존 Runtime이
계산한 **필수 자동 작성 필드의 준비 여부**이며 Draft가 다시 계산하지 않는다.

false면 Writer/output/store 등록 없이 HTTP 409, 기존 Batch와 같은 HTTPException detail envelope:

```json
{
  "detail": {
    "code":"DRAFT_NOT_READY",
    "message":"자동 작성에 필요한 정보를 확인할 수 없습니다.",
    "details":[{"fieldKey":"user_email","fieldLabel":"E-mail","status":"VALUE_MISSING"}]
  }
}
```

details는 required automatic blockers만 포함한다. USER_INPUT/LEFT_BLANK/optional 필드는 제외한다.
실제 Runtime Enum인 VALUE_MISSING/UNSUPPORTED/NEEDS_REVIEW/ERROR/NOT_IMPLEMENTED/INPUT_REQUIRED를
그대로 표현한다. field 값 및 generated missing_information 전문은 응답에 넣지 않는다.

| 코드 | HTTP | 의미 |
|---|---|---|
| TEMPLATE_NOT_FOUND | 404 | template 또는 연결된 program_document 없음 |
| TEMPLATE_NOT_READY | 409 | FAILED/PARSING/PENDING 등 COMPLETED가 아님 |
| DOCUMENT_NOT_WRITABLE | 409 | 작성용 아님 |
| NORMALIZED_FILE_NOT_FOUND | 404 | normalized_path 없음/파일 없음/일반 파일 아님 |
| UNSUPPORTED_SOURCE_FORMAT | 409 | normalized format/확장자가 HWPX 아님 |
| DRAFT_NOT_READY | 409 | 필수 자동 필드 미해결 |
| DRAFT_NOT_FOUND | 404 | 메모리 metadata 없음 |
| DRAFT_FILE_NOT_FOUND | 404 | 등록 파일 없음 |
| DRAFT_PATH_INVALID | 403 | root 탈출/잘못된 이름/symlink |
| INVALID_DRAFT_REQUEST | 422 | 요청 모델/UUID 검증 실패 |
| DRAFT_API_DISABLED | 503 | 기본값 또는 flag=false |
| DRAFT_ROOT_NOT_CONFIGURED / DRAFT_ROOT_INVALID | 503 | root 설정 문제 |

Writer의 안전한 code는 유지한다. 작성 조건 오류는 409,
WRITER_FAILED/OUTPUT_PUBLISH_FAILED/OUTPUT_VALIDATION_FAILED는 500이다.
Runtime 시스템 오류는 기존 code + 500, 그 밖의 예외는 DRAFT_GENERATION_FAILED + 500으로 숨긴다.
Writer 성공 뒤 실제 nonempty 파일 확인 및 root 검증을 통과한 경우만 metadata를 등록한다.

## GET /api/v1/document-agent/drafts/{draft_id}/file

UUID path parameter → metadata → 서버 저장 path를 사용한다. query로 파일 경로를 바꿀 수 없다.
resolved path가 configured root의 직접 자식인지, 파일명이 draft-{metadata UUID}.hwpx인지,
일반 파일인지 확인하고 symlink를 거부한다. ../, absolute path, encoded traversal을 접근 경로로 쓰지 않는다.
root 디렉터리는 서비스 운영자만 변경할 수 있는 신뢰된 저장 영역이어야 한다.

FileResponse는 attachment와 UUID 파일명을 사용한다. MIME은 실제 HWPX ZIP 컨테이너와
기존 Writer fixture의 mimetype에 맞는 **application/hwp+zip**을 사용한다.

## 설정과 운영 한계

```dotenv
DOCUMENT_AGENT_GENERATED_ROOT=/data/document-agent/generated
DOCUMENT_AGENT_DRAFT_API_ENABLED=true
```

root는 기본값 없이 절대 경로를 명시한다(기존 Batch의 필수 root 설정 관례).
필요한 디렉터리는 생성 시 만들며 파일은 UUID4 이름이고 기존 Writer가 overwrite를 거부한다.
feature flag는 기존 Batch와 같은 기본 false/503 패턴이다. 새로운 설정 framework는 없다.

**이 API에는 자체 인증이 없다. feature flag와 UUID는 인증/소유권 검사가 아니다.**
내부 network/reverse proxy restriction을 적용하고 외부에 직접 노출하지 않는다.
향후 Spring이 인증된 userId를 대신 전달하도록 연동한다. 이번에 Java/JWT/OAuth는 추가하지 않았다.

- 단일 FastAPI worker/replica 권장. metadata는 process-local이라 다른 worker에서 다운로드하면 404일 수 있다.
- 재시작하면 metadata가 사라진다. 파일이 남아 있어도 자동 복구/스캔하지 않는다.
- 자동 cleanup/TTL/capacity limit 없음. 파일과 metadata가 누적되므로 운영자가 수동 관리해야 한다.
- DB persistence/Redis/S3/queue/cache/idempotency/scheduler 없음. 반복 POST는 새 UUID를 만든다.
- 요청 취소/프로세스 종료/파일 작성 후 등록 실패 시 등록되지 않은 파일이 남을 수 있다.
  Writer atomic contract를 재사용하며 그런 파일을 성공 metadata로 등록하지 않는다.
- normalized source는 DB 경로다. Docker mount 경로가 DB normalized_path와 일치해야 한다.
- 원본 HWPX는 수정하지 않는다. 실제 한글 layout/줄 밀림은 육안 검증이 필요하다.

## 검증

새 테스트 52개: service/store/settings 32개, API 17개, E2E 3개.
E2E는 실제 card_blank.hwpx → fake 저장 schema/Source → 실제 Runtime → 실제 Writer → Parser 확인,
별도 COMPUTED+fake GENERATED 작성, scoped RAG 미지원 차단을 포함한다.
카드 결과는 작성14 / LEFT_BLANK4 / UNSUPPORTED2, 업체명3/이름4/생년월일/이메일,
한국어 개업일/직원수 suffix/동의 미선택/서명 suffix/원본 불변/ZIP 정상이다.

전체 **667개 중 666 passed, 1 skipped**. opt-in 실제 PostgreSQL integration skip 정책 유지.
실제 GMS/RAG/DB/Docker 실행은 하지 않았다. Windows Python 3.12 임시 테스트 의존성 환경이며
numpy 2.5.3은 배포 pin 2.3.5와 다르다. 배포 Python 3.11 Docker/모델 기동 검증은 별도다.

```bash
python -B -m unittest discover -s tests -p 'test_document_drafts*.py'
python -B -m unittest discover -s tests -p 'test_*.py'
```

## 수동 Docker / API E2E

ai 폴더에서 실행한다. Dockerfile CMD는 uvicorn app.main:app, port 8000, workers=1이다.
이미지를 갱신하려면 `docker build -t sobi-ai-test .`를 먼저 실행한다. 자동 실행하지 않았다.
기존 lifespan은 DB/embedding/OCR도 초기화하므로 기존 모델/DB 설정도 필요하다.
아래는 로컬 테스트용으로 포트를 loopback에만 공개한다.

```powershell
New-Item -ItemType Directory -Force "C:\Users\SSAFY\Desktop\ssafy\특화 프로젝트\generated" | Out-Null

docker run --rm -it `
  --env-file ../.env `
  -e POSTGRES_HOST=host.docker.internal `
  -e DOCUMENT_AGENT_GENERATED_ROOT=/data/document-agent/generated `
  -e DOCUMENT_AGENT_DRAFT_API_ENABLED=true `
  -v "C:\Users\SSAFY\Desktop\ssafy\특화 프로젝트\normalized:/data/document-agent/normalized:ro" `
  -v "C:\Users\SSAFY\Desktop\ssafy\특화 프로젝트\generated:/data/document-agent/generated" `
  -p 127.0.0.1:8000:8000 `
  sobi-ai-test

$body = @{ templateId = 15; userId = 2 } | ConvertTo-Json
$draft = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8000/api/v1/document-agent/drafts" `
  -ContentType "application/json" -Body $body
$draft
Invoke-WebRequest `
  -Uri "http://localhost:8000/api/v1/document-agent/drafts/$($draft.draftId)/file" `
  -OutFile "draft.hwpx"
```

DB가 이전 `/data/test/manual/normalized/...` 경로를 보관하면 위 mount만으로는 읽을 수 없다.
실제 DB normalized_path에 맞춰 동일 파일 디렉터리를 해당 container path에도 ro mount한다.
Draft Service는 DB 경로를 임의 변경/추정하지 않는다. originals mount는 필요 없다.

```bash
curl -X POST http://localhost:8000/api/v1/document-agent/drafts \
  -H 'Content-Type: application/json' -d '{"templateId":15,"userId":2}'
curl -L http://localhost:8000/api/v1/document-agent/drafts/{draftId}/file -o draft.hwpx
```

```sql
SELECT dt.id AS template_id, dt.program_document_id, pd.doc_name, dt.normalized_path
FROM document_template dt
JOIN program_document pd ON pd.id = dt.program_document_id
WHERE dt.parse_status = 'COMPLETED'
  AND pd.type = '작성용'
ORDER BY dt.id;
```

1. SQL로 COMPLETED+작성용 template 선택, 실제 user_id 확인.
2. normalized_path에 맞는 mount와 생성 root로 FastAPI 시작.
3. POST 완료 응답/draftId 확인, generated 폴더의 UUID HWPX 확인.
4. 같은 process에 GET 다운로드 요청.
5. Windows 한글에서 업체명/대표자 반복, 생년월일/E-mail/개업일/상시근로자 확인.
6. 동의·미동의 미선택, (인)/(서명/인), inline spacing, 페이지 밀림, 열기 오류 확인.
