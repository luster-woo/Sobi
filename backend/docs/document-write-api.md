# Spring 문서 초안 생성·다운로드 API

## 조사 결과 및 구현

- Java21 / Spring Boot3.5.16 / RestClient / Lombok / BusinessException convention을 유지한다.
- 기존 JwtAuthenticationFilter가 JWT subject를 Long principal로 저장한다.
  기존 Controller와 동일한 `@AuthenticationPrincipal Long userId`를 사용한다.
  CustomUserDetails/새 인증 구조는 추가하지 않는다.
- server.servlet.context-path=/api. Controller `/v1/document` + `/write/{programDocumentId}`로
  외부 URL은 **POST /api/v1/document/write/{programDocumentId}**이다.
- 기존 aiRestClient(AI_BASE_URL/ai.base-url, connect5초/read120초), aiOcrRestClient(read300초),
  RagClient/OcrClient가 있다. 기존 client/config를 수정하지 않았다.
- 문서 전용 RestClient는 aiRestClient.mutate()로 base URL 등 기존 설정을 재사용한다.
  읽기300초/연결5초를 문서 전용 request factory에만 설정한다.
  `ai.draft.read-timeout` 또는 `AI_DRAFT_READ_TIMEOUT`으로 조정 가능(예: 600s).
  다수 GENERATED 필드는300초를 넘길 수 있으며 이 경우 timeout 오류가 반환된다. 자동 retry는 없다.
- ProgramDocument Entity/Repository가 있으므로 findById/type 확인에 재사용한다.
  DocumentTemplate Entity/Repository는 없다. 새 Entity 대신 CompletedDocumentTemplateQuery가
  EntityManager native query로 scalar template ID만 읽는다.
- 기존 성공 파일 다운로드 Controller 사례와 Controller Swagger annotation 사용 사례는 찾지 못했다.
  별도 HTTP result DTO를 사용하고 Controller가 바이너리 응답을 구성한다.
  새로운 Swagger annotation 체계는 추가하지 않았다. Request body가 없는 API다.

## 호출 흐름

1. 인증 userId와 programDocumentId를 서비스에 전달한다. body/query의 userId는 사용하지 않는다.
2. ProgramDocumentRepository.findById로 문서 존재/작성용 여부 확인.
3. COMPLETED + 작성용인 template을 schema_version DESC, id DESC로 정렬해1개 조회.
   상위 버전이 FAILED여도 하위 COMPLETED 버전을 선택한다. programDocumentId와 templateId는 구분한다.
4. FastAPI POST `/api/v1/document-agent/drafts`에 templateId/userId만 전달한다.
5. 201을 포함한 정상 응답을 DTO로 읽고 COMPLETED/IDs/UUID/파일명/count를 확인한다.
6. 응답 programDocumentId가 원래 요청 문서와 동일한지도 서비스에서 확인한다.
7. 즉시 GET `/api/v1/document-agent/drafts/{draftId}/file`로 byte[]를 받는다.
8. 빈 body 또는 HWPX가 아닌 Content-Type을 거부한다.
9. Controller가 HTTP200 + application/hwp+zip + attachment + byte[]를 반환한다.

조회 SQL:

```sql
SELECT dt.id
FROM document_template dt
JOIN program_document pd ON pd.id = dt.program_document_id
WHERE dt.program_document_id = :programDocumentId
  AND dt.parse_status = 'COMPLETED'
  AND pd.type = '작성용'
ORDER BY dt.schema_version DESC, dt.id DESC
```

JPA Query.setMaxResults(1)로 결과를 제한하고 named parameter를 바인딩한다.
서비스 전체에 @Transactional을 붙이지 않아 외부 호출 동안 DB transaction을 유지하지 않는다.
Spring filesystem/S3/DB에 문서나 draftId를 저장하지 않는다.

## DTO와 HTTP

DraftCreateRequest: Long templateId, Long userId (내부 호출 전용, final/getter, setter 없음).
DraftCreateResponse: String draftId/status/fileName, Long templateId/programDocumentId,
int writtenFieldCount/leftBlankFieldCount/unsupportedFieldCount (getter/no-args, setter 없음).
DocumentWriteResult: byte[] content, String fileName/contentType (내부 결과).

filename은 FastAPI response의 값을 사용하되 `draft-{canonical UUID}.hwpx`와 일치해야 한다.
CR/LF, path traversal, 다른 확장자는 client에서 거부한다. ContentDisposition builder로 헤더를 생성한다.
Cache-Control: no-store. 이 응답에만 Content-Disposition 노출 헤더를 추가해 기존 허용 origin의
React가 파일명을 읽을 수 있게 한다. 공용 Security/CORS config는 그대로다.
성공은 **ApiResponse 없는 순수 바이너리**, 오류만 기존 GlobalExceptionHandler의 JSON이다.

```json
{
  "statusCode":409,
  "timestamp":"...",
  "path":"/api/v1/document/write/680",
  "message":"자동 작성에 필요한 정보를 확인할 수 없습니다.",
  "data":null,
  "error":{"code":"DOCUMENT_004"}
}
```

## 오류 매핑

기존 APPLICATION_DOCUMENT_*는 신청 업로드 서류 오류이며 이번 program_document/template과 다르다.
AI_API_ERROR도 추천 전용 메시지여서 변경하지 않고 문서 전용 최소 코드를 추가했다.

| 조건 | ErrorCode | HTTP/code |
|---|---|---|
| program_document 없음 | PROGRAM_DOCUMENT_NOT_FOUND | 404 / DOCUMENT_001 |
| 작성용 아님 또는 FastAPI DOCUMENT_NOT_WRITABLE | DOCUMENT_NOT_WRITABLE | 409 / DOCUMENT_002 |
| COMPLETED template 없음 / 생성 API404 | DOCUMENT_TEMPLATE_NOT_FOUND | 404 / DOCUMENT_003 |
| FastAPI409 DRAFT_NOT_READY 또는 TEMPLATE_NOT_READY | DOCUMENT_DRAFT_NOT_READY | 409 / DOCUMENT_004 |
| FastAPI 다운로드404 | DOCUMENT_DRAFT_FILE_NOT_FOUND | 404 / DOCUMENT_005 |
| 연결/timeout/5xx/422/잘못된 응답/기타 upstream 오류 | DOCUMENT_AGENT_REQUEST_FAILED | 502 / DOCUMENT_006 |

FastAPI 오류 body에서 detail.code만 ObjectMapper로 읽는다. 잘못된 JSON/다른 형태는 일반 외부 오류다.
FastAPI 원문 메시지, exception cause, field values, bytes, prompt/response를 로그·사용자 응답에 전달하지 않는다.
로그에는 요청 단계와 HTTP status만 기록한다. 기존 GlobalExceptionHandler가 안전한 BusinessException을 처리한다.

## 검증

신규37개 전부 통과:

- Client19: POST 경로/camelCase/201/DTO, GET/bytes/MIME/빈 body, 409/404/422/5xx/연결 실패,
  잘못된 응답/UUID/파일명 CRLF/template mismatch, 민감한 cause 비노출.
- Service7: 인증 ID + 조회→생성→다운로드 순서, 부재/제출용/COMPLETED 없음, 생성 실패 중단,
  다른 programDocument 응답 거부, 미인증 차단.
- Controller6: 실제 기존 JWT/Security filter 경유, binary/헤더, request userId 무시,
  401/400/409/502, 공통 JSON 오류 handler.
- Query3: ID 바인딩/scalar 결과, COMPLETED/작성용/최신 버전 정렬/LIMIT 계약, 빈 결과.
- Config2: 독립 client 및300초 기본 timeout, 무한 대기 설정 거부.

전체 Spring 테스트: **56개 중54개 통과,2개 실패**.
실패: 기존 SobiBackendApplicationTests.contextLoads, FundingServiceTest.추천_후보_조회.
실제 DB를 사용하지 않도록 datasource를 닫힌 로컬 포트로 지정하고 Flyway를 비활성화했다.
두 테스트는 실제 PostgreSQL을 요구해 EntityManagerFactory 초기화에서 실패했다.
기존 테스트나 그 결과를 통과시키기 위해 production 설정/테스트를 바꾸지 않았다.

실제 FastAPI/DB 호출, Flyway migration, Docker 실행은 하지 않았다.
native SQL은 mock query 계약을 검증했으며 실제 PostgreSQL 데이터에 대한 통합 실행은 남아 있다.

```powershell
# Java21/Gradle 환경에서 신규 테스트만 (실제 FastAPI/DB 불필요)
.\gradlew.bat test --tests "com.sobi.document.write.*"
```

## 수동 확인

Spring의 AI_BASE_URL이 실제 FastAPI 주소를 가리키고 FastAPI에는
DOCUMENT_AGENT_DRAFT_API_ENABLED=true 및 generated root/normalized mount가 준비되어 있어야 한다.
두 FastAPI 요청은 같은 metadata 저장 process에 도달해야 한다(현재 단일 worker/replica 권장).

선택할 programDocumentId 확인:

```sql
SELECT pd.id AS program_document_id, dt.id AS template_id, dt.schema_version
FROM program_document pd
JOIN document_template dt ON dt.program_document_id = pd.id
WHERE pd.type = '작성용' AND dt.parse_status = 'COMPLETED'
ORDER BY pd.id, dt.schema_version DESC;
```

```powershell
# 로그인으로 받은 access token을 환경변수에 준비. body/userId는 보내지 않는다.
curl.exe --fail-with-body -X POST `
  "http://localhost:8080/api/v1/document/write/680" `
  -H "Authorization: Bearer $env:SOBI_ACCESS_TOKEN" `
  -D draft-headers.txt -o draft.hwpx
```

HTTP200/MIME/Content-Disposition과 파일을 확인하고 Windows 한글로 열어 검수한다.
오류 응답은 JSON이므로 실패한 요청의 출력 파일을 HWPX로 취급하지 않는다.

React 예시(프론트 파일은 수정하지 않음):

```javascript
async function downloadDraft(programDocumentId, accessToken) {
  try {
    const response = await axios.post(
      `/api/v1/document/write/${programDocumentId}`,
      undefined,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'blob',
        timeout: 660000, // 생성+다운로드 두 내부 호출 및 proxy timeout도 함께 고려
      },
    );
    const disposition = response.headers['content-disposition'] ?? '';
    const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'draft.hwpx';
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    // responseType=blob이므로 기존 JSON 오류도 Blob으로 들어온다.
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      try {
        const body = JSON.parse(text);
        throw new Error(body.message ?? '초안 작성에 실패했습니다.');
      } catch (parseError) {
        if (parseError instanceof SyntaxError) throw new Error('초안 작성에 실패했습니다.');
        throw parseError;
      }
    }
    throw error;
  }
}
```

## 제한사항

- 동기 HTTP 두 번이므로 reverse proxy/브라우저 timeout도 충분히 설정해야 한다.
- byte[]로 문서를 메모리에 받는다. 일반 신청서 규모 전제이며 대용량 streaming은 이번 범위가 아니다.
- FastAPI 메모리 metadata 유실/worker 불일치 시 다운로드404가 가능하다.
- 다운로드 실패 시 Spring에 draftId를 저장하거나 자동 재시도하지 않는다. 재요청은 새 draft를 만든다.
- FastAPI의 기존 미지원 필드/LEFT_BLANK/ready_for_write 정책을 그대로 따른다.
- Spring은 HWPX를 파싱·수정하지 않으며 파일 내용 검증은 기존 FastAPI Writer 계약을 신뢰한다.
- 기존 FundingService.java의 작업 시작 전 미커밋 변경은 건드리지 않았다.

## 이번 작업 파일 목록

### 생성 (16개)

- src/main/java/com/sobi/document/write/client/DocumentAgentClient.java
- src/main/java/com/sobi/document/write/clientDto/DraftCreateRequest.java
- src/main/java/com/sobi/document/write/clientDto/DraftCreateResponse.java
- src/main/java/com/sobi/document/write/config/DocumentAgentClientConfig.java
- src/main/java/com/sobi/document/write/config/DocumentAgentProperties.java
- src/main/java/com/sobi/document/write/controller/DocumentWriteController.java
- src/main/java/com/sobi/document/write/dto/DocumentWriteResult.java
- src/main/java/com/sobi/document/write/repository/CompletedDocumentTemplateQuery.java
- src/main/java/com/sobi/document/write/service/DocumentWriteService.java
- src/main/java/com/sobi/document/write/service/DocumentWriteServiceImpl.java
- src/test/java/com/sobi/document/write/client/DocumentAgentClientTest.java
- src/test/java/com/sobi/document/write/config/DocumentAgentClientConfigTest.java
- src/test/java/com/sobi/document/write/controller/DocumentWriteControllerTest.java
- src/test/java/com/sobi/document/write/repository/CompletedDocumentTemplateQueryTest.java
- src/test/java/com/sobi/document/write/service/DocumentWriteServiceTest.java
- docs/document-write-api.md

### 수정 (1개)

- src/main/java/com/sobi/global/exception/ErrorCode.java: 문서 작성 오류6개 추가.

### 삭제

없음. FastAPI/React/DB migration/기존 팀원 document 검증·OCR·신청 코드는 변경하지 않았다.
