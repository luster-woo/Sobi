# Document Agent Runtime v1

Preprocessing이 확정한 schema를 읽어 값을 해결한다. 정형 routing은 코드가 수행하며
Schema Analyzer/LLM에 Source 선택이나 의미 판단을 다시 요청하지 않는다.
새 Writer, Calculator, Generation/RAG Tool, HTTP endpoint, DB 저장/migration은 없다.

## 조사 / public API / 입력

기존 Source public API:

```python
await SourceService(PostgresDataProvider()).resolve_source(context, source_request)
```

`SourceResolveContext`: user_id / support_program_id만 필요하다.
BUSINESS/MYDATA는 기존 Provider가 user_id→business_info→brn 관계를 조회하므로 business_id가 필요 없다.
application_id/loan_id/account_id는 사용하지 않는다. PROGRAM의 support_program_id는 선택 template에
연결된 program_document에서 가져온다. SQL로 SourceKey 값을 직접 조회하거나 Registry를 변경하지 않는다.

```python
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest

# 기존 app.core.db pool이 열린 신뢰된 application 환경
result = await DocumentAgentRuntime().resolve(DocumentRuntimeRequest(
    template_id=123,
    user_id=456,
    user_inputs={"bank_name": "국민은행"},
))
```

핵심 입력은 exact template_id/user_id와 field_key 기준 user_inputs(JSON 객체)다.
신뢰된 상위 서비스가 인증된 user_id와 문서 접근 권한을 보장해야 한다. Runtime이 인증/권한 시스템을 대체하지 않는다.
repository/source_resolver를 constructor에서 주입할 수 있다. 새 미래 executor abstraction은 만들지 않았다.

## Template/schema 조회

현재 전처리 version=1을 Runtime에 하드코딩하지 않는다. 요청의 exact template_id를 사용하고
COMPLETED 및 연결된 program_document.type='작성용'을 확인한다. 자동 최신 version 선택/이전 version fallback은 없다.
따라서 FAILED/PARSING/PENDING 요청은 TEMPLATE_NOT_COMPLETED로 중단하며 다른 template을 몰래 선택하지 않는다.
없으면 TEMPLATE_NOT_FOUND, DB/유효하지 않은 schema load는 SCHEMA_LOAD_FAILED다.

기존 acquire + 짧은 REPEATABLE READ / READ ONLY transaction에서 template/field/source를 3회 SELECT한다.
field는 field_order, id 순서, source는 priority, id 순서다. N+1 없이 sources를 field ID에 묶는다.
여러 SELECT 도중 replace-all이 일어나도 서로 다른 snapshot의 field/source가 섞이지 않는다.
조회 완료 후 transaction과 연결을 반환하고 Source 실행을 시작한다.
이 snapshot은 load 시점의 COMPLETED 상태를 보장할 뿐 이후 동시 재분석/삭제를 막지는 않는다.
향후 Writer 직전에는 상위 orchestration에서 template/snapshot의 유효성을 다시 확인해야 한다.

## Routing 우선순위

| 조건 | runtime_status | 실행 |
| --- | --- | --- |
| mapping_status=UNSUPPORTED | UNSUPPORTED | 없음 |
| mapping_status=NEEDS_REVIEW | NEEDS_REVIEW | 없음 |
| RESOLVED + DIRECT | Source 결과에 따라 결정 | 기존 SourceService |
| RESOLVED + USER_INPUT | RESOLVED / INPUT_REQUIRED / ERROR | supplied input |
| RESOLVED + COMPUTED | NOT_IMPLEMENTED | 없음 |
| RESOLVED + GENERATED | NOT_IMPLEMENTED | 없음 |

mapping_status와 field_type은 결과에 원래 값으로 보존한다. supplied input이 있더라도
mapping_status 차단을 우회하지 않는다. COMPUTED/GENERATED의 instruction/sources/location_info도 유지한다.

DIRECT source는 priority ASC (동률이면 source ID ASC)로 시도한다.

- found=True + non-null value: 성공, 즉시 중단. source_type/key/priority를 provenance에 기록.
- found=False: 다음 source 시도. 모두 부재면 VALUE_MISSING.
- SourceError: unsupported 코드면 UNSUPPORTED, 나머지는 ERROR. **오류에 fallback하지 않는다.**
- 예상하지 못한 예외: 해당 field ERROR/FIELD_RESOLUTION_ERROR. 다른 field는 계속 진행.
- DIRECT + sources=[]: ERROR/MISSING_SOURCE_DEFINITION.
- 알 수 없는 SourceType/Key: UNSUPPORTED/UNSUPPORTED_SOURCE_DEFINITION.
- RAG/PROGRAM_RAG: UNSUPPORTED/RAG_NOT_SUPPORTED, Source나 팀원 RAG를 호출하지 않음.
- found=True인데 value=None 또는 반환 Source가 요청과 다르면 ERROR (contract 불일치).

SourceService는 BUSINESS_NOT_FOUND 등 missing 오류를 found=False로 변환하지만 시스템/파라미터/무결성 오류는
SourceError로 전달한다. Runtime은 이 contract를 그대로 따른다. SourceError 메시지/metadata 전체는 결과에 복사하지 않는다.
source.required는 정의에 보존하며 이번 DIRECT fallback은 priority+found 기준이다.
DIRECT에 REVENUE_SUM 같은 기존 계산 SourceKey가 저장되어 있다면 기존 Resolver를 그대로 호출한다.
이는 새 COMPUTED engine 실행이 아니다. field_type=COMPUTED 자체는 이번 버전에서 실행하지 않는다.

Source value는 date/Decimal/JSON 타입을 유지하고 문자열·숫자 formatting을 하지 않는다.
0/False/빈 리스트/공백 문자열도 Resolver가 found=True로 선언하면 값을 그대로 존중한다.
Source의 value_type 호환성·표시 formatting은 이번 버전에서 강제하지 않는다.

## USER_INPUT / 기본 자료형

key는 label이 아닌 field_key다. 존재하지 않는 key는 UNKNOWN_USER_INPUT_KEY로 실행 전 전체 validation 오류.
USER_INPUT 이외 field에 값이 주어지면 USER_INPUT_FIELD_TYPE_MISMATCH이며 DIRECT override는 지원하지 않는다.
부재/null/공백 문자열은 INPUT_REQUIRED. 0/False/빈 JSON list/object는 제공된 값이다.

| value_type | 허용값 |
| --- | --- |
| TEXT | 문자열 (원형 보존) |
| NUMBER | JSON int/유한 float; bool/숫자 문자열 제외 |
| DATE | 유효한 YYYY-MM-DD 문자열; 변환 없이 보존 |
| BOOLEAN | bool만 |
| JSON | JSON 값; 중첩 NaN/Infinity 제외 |

잘못된 type은 해당 field ERROR/INVALID_USER_INPUT_TYPE이다.
constraints/min_length/max_length는 보존만 하고 강제하지 않는다.
복잡한 Validation Agent/Writer formatting은 별도 단계이며 현재 ready_for_write는 종합 검증 결과가 아니다.

## 결과 / Writer contract

DocumentRuntimeResult: template_id/program_document_id/schema_version/normalized_format/normalized_path,
fields/total_fields/status_counts/ready_for_write.

ResolvedField: field_schema_id/key/label/order/type/value_type/mapping_status/required,
instruction/constraints/min_length/max_length/location_info/sources,
runtime_status/value, 성공 Source provenance, error_code/error_message.

RuntimeFieldStatus는 RESOLVED, INPUT_REQUIRED, NEEDS_REVIEW, UNSUPPORTED,
VALUE_MISSING, NOT_IMPLEMENTED, ERROR의 독립 enum이다. schema mapping_status와 구분한다.
status_counts는 모든 Runtime status별 개수를 포함한다.

ready_for_write는 **required=true인 모든 field가 RESOLVED인지**만 검사한다.
optional 미해결은 막지 않는다. required field가 없거나 전체 field가 0개여도 정의상 true다.
이 값은 문서 내용/자료형 전체 검증 또는 실제 Writer 실행 성공을 보장하지 않는다.

DB의 location_info는 JSON 그대로 deep-copy하여 전달한다. StoredLocationInfo로 재구성하거나
native_ref/element_path/hints/target_location을 변경하지 않는다. 입력 모델도 수정하지 않는다.
Writer는 향후 runtime_status=RESOLVED인 field의 value/value_type/location_info만 삽입 대상으로 사용한다.
Runtime은 입력 문서 파일을 열거나 수정하지 않는다. 결과는 DB/BatchStore 등에 저장하지 않는다.

## 개발 CLI

V23 및 기존 DB/Source 데이터가 준비된 환경에서 ai 디렉터리 또는 컨테이너 /app 기준:

```sh
python -B -m app.agent.documents.runtime 123 456
python -B -m app.agent.documents.runtime 123 456 --user-inputs /data/test/runtime-inputs.json
# 개인정보를 포함할 수 있는 전체 결과 출력은 개발 환경에서만 명시적으로:
python -B -m app.agent.documents.runtime 123 456 --show-values
```

첫 인자는 exact template_id, 두 번째는 user_id다. user-inputs 파일은 field_key→값 JSON 객체다.
기본 출력은 ID/상태/집계/key/오류 코드이며 값·라벨·위치·서버 경로·Source params는 출력하지 않는다.
--show-values는 민감한 값을 포함하므로 공유 로그/운영 로그로 무분별하게 리다이렉트하지 않는다.
CLI exit 0은 Runtime 결과 반환 성공을 뜻하며 ready_for_write=true를 뜻하지 않는다.
GMS/RAG는 어떤 옵션에서도 호출하지 않는다. 실제 Source DB 조회는 발생한다.

## 테스트와 제한

```sh
python -B -m unittest discover -s tests -p 'test_document_runtime.py'
python -B -m unittest discover -s tests
```

fake repository/Source Resolver 및 실제 SourceService+fake provider 연결로 검증한다.
repository SQL/transaction 경계는 fake connection으로 검증하며 실제 PostgreSQL snapshot 동시성은 추가 통합 검증이 필요하다.
기존 Source Resolver/Analyzer/Persistence/Preprocessing/Batch/RAG/core/main/migration은 변경하지 않았다.
COMPUTED/GENERATED executor, Writer, Validation Agent, HTTP API, draft 저장은 후속 작업이다.
