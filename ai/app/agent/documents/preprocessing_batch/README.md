# Document Agent Batch (process memory only)

DB의 작성용 문서를 ID 순서로 순차 처리하며 기존 TemplatePreprocessingService를 그대로 호출한다.
API/CLI 모두 BatchPreprocessingService를 쓴다. Redis, 새 DB 테이블, migration, worker framework는 없다.

## 기존 구조 조사 / 추가 범위

FastAPI는 app/main.py에서 router를 조립하고 각 기능 폴더의 router.py에 endpoint와 Pydantic 응답을 둔다.
FastAPI 공통 응답 wrapper/admin 인증 dependency/background runner는 없다.
Spring의 보안/Redis 코드는 별도 서비스이며 가져오거나 수정하지 않는다.
공용 config의 dotenv 로딩과 os.getenv 패턴을 신규 BatchSettings에서 재사용한다.
app.core는 수정하지 않는다. app/main.py에는 router import/include_router 두 줄만 추가한다.

구성:

- service.py: 대상 순회, 정책, 단일 서비스 호출, 예외 격리
- repository.py: 작성용 문서 + version 1 template 상태 조회
- files.py/config.py: 서버 root 설정과 ID 디렉터리 resolve
- store.py/models.py/errors.py: 메모리 상태, typed 결과, 오류
- router.py: 시작/조회 API, BackgroundTasks 연결
- __main__.py: 동일 Runner를 호출하는 CLI

## 환경변수 / 배포

```dotenv
DOCUMENT_AGENT_ORIGINAL_ROOT=/data/document-agent/originals
DOCUMENT_AGENT_NORMALIZED_ROOT=/data/document-agent/normalized
# 내부망 접근제어를 갖춘 후에만 활성화. 인증 기능이 아니다.
DOCUMENT_AGENT_BATCH_API_ENABLED=true
```

두 root는 필수이며 기본값을 추측하지 않는다. 절대 경로, 서로 겹치지 않는 디렉터리를 요구한다.
원본 root는 존재해야 한다. normalized 디렉터리는 기존 Normalizer가 필요할 때 생성한다.
config 오류는 시작 전 실패하고 DB 접근 실패 등 실행 기반 오류는 Batch FAILED로 기록한다.
requirements/config/Dockerfile/배포 compose를 자동 수정하지 않는다.

EC2 호스트:

```text
/home/ubuntu/document-agent/originals/
  1/application.hwp
  2/support.hwpx
  3/logistics.hwp
/home/ubuntu/document-agent/normalized/
```

기존 ai 서비스 배포 설정에 운영자가 다음 mount/env를 반영한다:

```yaml
volumes:
  - /home/ubuntu/document-agent/originals:/data/document-agent/originals:ro
  - /home/ubuntu/document-agent/normalized:/data/document-agent/normalized
environment:
  DOCUMENT_AGENT_ORIGINAL_ROOT: /data/document-agent/originals
  DOCUMENT_AGENT_NORMALIZED_ROOT: /data/document-agent/normalized
  DOCUMENT_AGENT_BATCH_API_ENABLED: "true"
```

앱은 host 경로를 사용하지 않는다. 원본을 변경/삭제/이동하지 않고 출력은 normalized/{id}/만 사용한다.
원본과 normalized의 기존 unique filename 정책은 단일 서비스/Normalizer에 맡긴다.
V23까지 적용된 PostgreSQL, 기존 DB/GMS 환경변수, Java/hwp2hwpx가 준비되어야 한다.

## DB / 파일 정책

`WHERE pd.type = '작성용' ORDER BY pd.id`, version 1 template LEFT JOIN으로 조회한다.
제출용과 DB에 없는 디렉터리는 대상이 아니다. source URL/파일명은 경로 생성에 사용하지 않는다.
호출 시점의 DB 조회 결과를 이번 Batch 대상/skip 판단 기준으로 사용한다.

`original_root / str(program_document.id)` 바로 아래의 일반 파일만 검사한다.
확장자는 대소문자 무관 HWP/HWPX/DOC/DOCX를 후보로 센다.
점(.) 또는 물결(~)로 시작하는 파일, ~로 끝나는 파일, Windows hidden/temporary 파일은 제외한다.
다른 확장자 및 하위 디렉터리는 후보가 아니다. 심볼릭 링크/ID 디렉터리 경로 우회는 거부한다.
root는 신뢰할 수 있는 운영 설정이며 원본은 read-only mount하고 처리 도중 관리자가 경로를 바꾸지 않는다.

| 상황 | item error_code |
| --- | --- |
| ID 디렉터리 없음 | SOURCE_DIRECTORY_NOT_FOUND |
| 후보 0개 | SOURCE_FILE_NOT_FOUND |
| 후보 2개 이상 (HWP+DOC 포함) | MULTIPLE_SOURCE_FILES |
| DOC/DOCX 한 개 | PARSER_FORMAT_UNSUPPORTED |
| 경로 우회 | UNSAFE_SOURCE_PATH / UNSAFE_OUTPUT_PATH |
| 단일 서비스 예외 / 파일 I/O 예외 | PREPROCESSING_FAILED |

HWP/HWPX가 정확히 한 개면 기존 preprocess(id, source, output, original_format=...)를 호출한다.
Batch는 확인한 확장자를 기존 DocumentFormat Enum으로 전달한다. 실제 파일 검증은 기존 Normalizer가 수행한다.
파일 resolve 실패는 **item 실패만** 기록하며 template을 생성하거나 상태를 직접 변경하지 않는다.
실패 item의 template_id는 조회 시점에 있던 ID이며 없던 template이 실행 중 생성된 후 실패하면 null일 수 있다.

## 실행/집계 정책

| 조회된 상태 | 기본 정책 | 옵션 |
| --- | --- | --- |
| template 없음 / PENDING | PROCESS | 동일 |
| FAILED | PROCESS | retry_failed=false면 SKIP |
| COMPLETED | SKIP | reprocess_completed=true면 PROCESS |
| PARSING | 항상 SKIP | 동일 |

각 item은 독립 try/except로 처리한다. 일부 item 실패도 Batch는 COMPLETED가 될 수 있다.
total=조회한 작성용 수, processed=completed+failed+skipped. 정상 Batch 종료 시 processed=total이다.
completed는 단일 서비스 성공, failed는 파일/전처리 실패, skipped는 정책상 미실행이다.
원래 exception text/경로/문서/프롬프트/개인정보를 상태에 저장하지 않는다. ID/상태/고정 오류만 저장한다.
RUNNING 시작은 POST 접수 시점이며 total은 DB 조회 완료 후 채운다. 조회 전 total=0이다.

## 메모리 Store와 lock

InMemoryBatchStore 한 컴포넌트가 상태와 active batch ID를 관리한다.
threading.Lock은 짧은 동기 메모리 갱신에만 사용하고 I/O/await 중에는 유지하지 않는다.
시작 검사와 active 등록이 원자적이며 실행 중 두 번째 시작은 BATCH_ALREADY_RUNNING이다.
service.run의 finally가 active 소유권을 해제한다. 취소/Batch 오류도 실패 기록 후 해제한다.
동일 batch의 background run을 중복 실행하지 못하도록 claim도 확인한다.
GET에는 deep copy를 반환한다. 최근 50개 Batch만 유지하며 다음 시작 시 오래된 완료 기록을 제거한다.
개별 결과는 ID/상태만 포함하지만 문서가 매우 많으면 메모리/GET 응답 크기가 커질 수 있다.

**단일 프로세스, 단일 worker, 단일 replica만 지원한다.**

```sh
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

--workers 2/4 또는 복수 컨테이너에서는 worker마다 상태/lock이 달라 조회 실패/중복 Batch가 가능하다.
CLI도 별도 프로세스이므로 **API Batch와 CLI 또는 복수 CLI를 동시에 실행하지 않는다.**
향후 공유 상태/내구성이 필요하면 Redis/DB job table/별도 worker가 필요하나 이번에는 추가하지 않았다.
재시작 시 메모리 상태/조회 이력이 사라지고 BackgroundTasks가 중단될 수 있다. DB 결과는 남는다.
강제 종료 시 기존 단일 서비스의 PARSING이 남을 수 있으며 Batch는 항상 skip한다.
운영자가 작업 종료를 확인한 뒤 별도 복구해야 하며 자동 stale 판정/탈취는 하지 않는다.
외부에서 template 상태를 바꾸거나 단일 CLI를 동시에 호출하는 경우는 Batch lock 범위 밖이다.

## API / 보안

현재 FastAPI에 admin/internal 인증 dependency가 없고 새 인증을 만들지 않았다.
API는 **운영 내부망/인증된 reverse proxy 접근제어에 의존**한다.
활성화 env는 배포 스위치일 뿐 인증이 아니다. 외부 인터넷에 노출하지 않는다.
기본 미활성화 시 두 endpoint 모두 HTTP 503 BATCH_API_DISABLED를 반환한다.

```sh
curl -X POST http://ai:8000/api/v1/document-agent/preprocessing/batches \
  -H 'Content-Type: application/json' \
  -d '{"reprocess_completed":false,"retry_failed":true}'
# 202 {"batchId":"...","status":"RUNNING"}

curl http://ai:8000/api/v1/document-agent/preprocessing/batches/BATCH_UUID
```

POST는 예약 후 FastAPI BackgroundTasks에 동일 Runner를 등록한다. 완료를 기다리지 않고 202를 전송한다.
GET은 batchId/status/total/processed/completed/failed/skipped/startedAt/finishedAt/errorCode/items를 반환한다.
공통 wrapper가 없어 기존 router처럼 Pydantic response_model을 사용한다.
오류는 FastAPI HTTPException의 detail={code,message} 형태. 동시 실행 409, 미존재/퇴출 UUID 404,
잘못된 UUID/body 422, 설정 오류 503이다. request에 root path를 넣으면 422로 거부한다.

## CLI / 재실행 / 단일 문서 E2E 이후 운영 확인

```sh
python -B -m app.agent.documents.preprocessing_batch
python -B -m app.agent.documents.preprocessing_batch --reprocess-completed
python -B -m app.agent.documents.preprocessing_batch --no-retry-failed
```

CLI는 완료까지 기다려 최종 집계를 JSON으로 출력한다. Batch 자체 실패 또는 item 실패가 있으면 exit 1이다.
API 활성화 env는 CLI에 필요하지 않다. root/DB/GMS 설정은 동일하게 필요하다.
기본 재실행은 COMPLETED를 건너뛰고 FAILED를 재시도한다. 파일 누락이면 업로드 후 다시 실행한다.
완료 문서를 재분석하려면 옵션을 켜며 기존 Persistence replace-all로 누적을 막는다.
Runtime 소비자는 반드시 document_template.parse_status='COMPLETED'만 사용한다.
FAILED에는 이전 정상 snapshot과 새 파일 경로가 공존할 수 있으며 Batch가 이 계약을 변경하지 않는다.

## 테스트

```sh
python -B -m unittest discover -s tests -p 'test_preprocessing_batch*.py'
python -B -m unittest discover -s tests
```

실제 GMS/EC2 파일 변경 없이 fake 단일 서비스와 임시 디렉터리를 사용한다.
ASGI send 이벤트로 응답이 background 완료 전에 전송되는지 검증한다.
DB 대상 SQL 필터/정렬/버전은 fake connection으로 검증하며 실제 DB/EC2 통합은 별도로 수행해야 한다.
기존 안정화 모듈/DB migration/Redis/requirements/팀원 기능 코드 변경 없음.
