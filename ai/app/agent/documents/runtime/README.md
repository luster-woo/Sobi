# Document Agent Runtime v3

Preprocessing이 확정한 schema를 읽어 값을 해결한다. 정형 routing은 코드가 수행하며
Schema Analyzer/LLM에 Source 선택이나 의미 판단을 다시 요청하지 않는다.
GENERATED 초안 생성은 Runtime 내부에서 수행한다. 새 Writer, HTTP endpoint, DB 저장/migration은 없다.

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
))
```

핵심 입력은 exact template_id/user_id다. user_inputs는 2026-09-18 정책 변경으로 제거했다.
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
| USER_INPUT (모든 mapping_status) | LEFT_BLANK / value=null | 없음, 원본 직접 기재 영역 보존 |
| RESOLVED + COMPUTED | 기존 계산 Source contract에 따라 결정 | 아래 v2 범위 참고 |
| RESOLVED + GENERATED | RESOLVED / INPUT_REQUIRED / ERROR / UNSUPPORTED | field 단위 GMS |

USER_INPUT은 가장 먼저 LEFT_BLANK로 처리한다. 다른 field는 기존 mapping_status 차단을 유지한다.
mapping_status와 field_type은 원래 값으로 보존하고 COMPUTED/GENERATED의 instruction/sources/location_info도 유지한다.

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
이는 새 범용 계산 engine 실행이 아니다. field_type=COMPUTED는 아래 v2의 제한된 단일 Source 계약만 실행한다.

Source value는 date/Decimal/JSON 타입을 유지하고 문자열·숫자 formatting을 하지 않는다.
0/False/빈 리스트/공백 문자열도 Resolver가 found=True로 선언하면 값을 그대로 존중한다.
Source의 value_type 호환성·표시 formatting은 이번 버전에서 강제하지 않는다.

## USER_INPUT / 직접 기재 영역 (2026-09-18)

USER_INPUT은 자동작성 범위 밖이다. required/value_type/mapping_status와 무관하게
LEFT_BLANK, value=null로 반환하며 Source/GMS/Computed 실행 및 추가 입력 요청을 하지 않는다.
동의/미동의/서명/날인 등도 Analyzer가 USER_INPUT으로 분류한 계약을 따르고 Writer가 의미를 재판단하지 않는다.
원본이 반드시 빈 문자열이라는 뜻은 아니다. 기존 문서의 텍스트/선택 상태를 그대로 보존한다.

repository 전체 사용처는 Request, Runtime/Writer 개발 CLI, 테스트/README뿐이며 외부 production API 의존은 없다.
GENERATED/COMPUTED에도 dependency 계약이 없어 user_inputs와 두 CLI의 --user-inputs를 제거했다.
구형 user_inputs 전달은 extra=forbid validation에서 거부된다. 무시하거나 자동작성에 이용하지 않는다.
관련 USER_INPUT supplied-input 자료형 검증 함수도 제거했다. DIRECT/COMPUTED/GENERATED 의미는 그대로다.

## 결과 / Writer contract

DocumentRuntimeResult: template_id/program_document_id/schema_version/normalized_format/normalized_path,
fields/total_fields/status_counts/ready_for_write.

ResolvedField: field_schema_id/key/label/order/type/value_type/mapping_status/required,
instruction/constraints/min_length/max_length/location_info/sources,
runtime_status/value, 성공 Source provenance, error_code/error_message.

RuntimeFieldStatus는 RESOLVED, LEFT_BLANK, INPUT_REQUIRED, NEEDS_REVIEW, UNSUPPORTED,
VALUE_MISSING, NOT_IMPLEMENTED, ERROR의 독립 enum이다. schema mapping_status와 구분한다.
status_counts는 모든 Runtime status별 개수를 포함한다.

ready_for_write는 **USER_INPUT을 제외한 자동작성 대상 중 required=true인 모든 field가 RESOLVED인지**만 검사한다.
USER_INPUT은 required=true여도 막지 않는다. optional 미해결도 막지 않는다. 자동작성 required field가 없으면 true다.
이는 제출 가능한 완성 신청서 판정이 아니라 Writer 실행 가능 판정이다. 사용자가 직접 기재할 빈칸이 남을 수 있다.
이 값은 문서 내용/자료형 전체 검증 또는 실제 Writer 실행 성공을 보장하지 않는다.

DB의 location_info는 JSON 그대로 deep-copy하여 전달한다. StoredLocationInfo로 재구성하거나
native_ref/element_path/hints/target_location을 변경하지 않는다. 입력 모델도 수정하지 않는다.
Writer는 향후 runtime_status=RESOLVED인 field의 value/value_type/location_info만 삽입 대상으로 사용한다.
Runtime은 입력 문서 파일을 열거나 수정하지 않는다. 결과는 DB/BatchStore 등에 저장하지 않는다.

## 개발 CLI

V23 및 기존 DB/Source 데이터가 준비된 환경에서 ai 디렉터리 또는 컨테이너 /app 기준:

```sh
python -B -m app.agent.documents.runtime 123 456
# 개인정보를 포함할 수 있는 전체 결과 출력은 개발 환경에서만 명시적으로:
python -B -m app.agent.documents.runtime 123 456 --show-values
```

첫 인자는 exact template_id, 두 번째는 user_id다. --user-inputs는 지원하지 않는다.
기본 출력은 ID/상태/집계/key/오류 코드이며 값·라벨·위치·서버 경로·Source params는 출력하지 않는다.
--show-values는 민감한 값을 포함하므로 공유 로그/운영 로그로 무분별하게 리다이렉트하지 않는다.
CLI exit 0은 Runtime 결과 반환 성공을 뜻하며 ready_for_write=true를 뜻하지 않는다.
기본 CLI는 GMS 비활성이다(GENERATION_DISABLED). --generate에서만 실제 GMS를 호출한다. 실제 Source DB 조회는 발생한다. RAG는 아직 연결하지 않는다.

## 테스트와 제한

```sh
python -B -m unittest discover -s tests -p 'test_document_runtime.py'
python -B -m unittest discover -s tests
```

fake repository/Source Resolver 및 실제 SourceService+fake provider 연결로 검증한다.
repository SQL/transaction 경계는 fake connection으로 검증하며 실제 PostgreSQL snapshot 동시성은 추가 통합 검증이 필요하다.
기존 Source Resolver/Analyzer/Persistence/Preprocessing/Batch/RAG/core/main/migration은 변경하지 않았다.
범용 COMPUTED, Writer, Validation Agent, HTTP API, draft 저장은 후속 작업이다.

## v2 — 현재 계약으로 가능한 COMPUTED만 실행

조사 결과 (운영 DB 직접 조회가 아닌 repository 코드/모델/migration 기준):

- Analyzer 모델에는 operation/rate/cap/operand_field_key/field dependency 필드가 없다.
- Persistence는 instruction과 source_type/key/priority/params를 저장한다. constraints/min/max는 NULL이다.
- Analyzer Prompt는 COMPUTED+RESOLVED를 기존 계산 SourceKey와 허용 params로 정확하게 표현하도록 요구한다.
  analyzer.py도 COMPUTED_REQUIRES_COMPUTED_KEY와 params 검증을 수행한다.
- 현재 구조화된 계산 정의는 **계산 SourceKey + 기존 Source params**다.
  PeriodParams에는 months만, EmptyParams에는 아무 항목도 허용되지 않는다.
- 여러 Source의 operand/fallback 관계나 USER_INPUT dependency를 표현하는 계약은 없다.

따라서 Runtime에서 새로운 operation JSON 계약이나 자연어 parser를 만들지 않는다.
computed.py의 ComputedExecutor는 prepare(기존 contract를 typed ComputedDefinition으로 검증),
execute(Resolver가 이미 계산한 결과의 자료형 검증/반환)만 담당한다.
DB/GMS/RAG를 호출하지 않으며, 실제 계산은 Service가 기존 SourceService.resolve_source에 위임한다.
Resolver SQL/산술을 다시 구현하지 않는다. ResolvedField/DB 모델은 변경하지 않았다.

지원하는 기존 operation 식별자는 다음 SourceKey 6개뿐이다:

| SourceKey | params | 기존 계산 / 결과 |
| --- | --- | --- |
| REVENUE_SUM / TAX_SUM | months: 양의 정수 | 최근 완료 N개월 합계 / int |
| REVENUE_AVERAGE / TAX_AVERAGE | months: 양의 정수 | 최근 완료 N개월 평균 / Decimal |
| BUSINESS_AGE_MONTHS | 없음 | 개업일부터 완료 개월 수 / int |
| INSURANCE_ENROLLED | 없음 | 보험 목록 기준 가입 여부 / bool |

단일 source만 실행한다. 여러 source는 priority 순서대로 보존하지만 대체값/서로 다른 operand인지
구별되지 않아 계산하지 않는다. months는 당월 제외 rolling 기간이며 calendar year로 해석하지 않는다.
지급액=운반비×50% 같은 MULTIPLY_RATE, 범용 SUM/SUBTRACT/MIN/MAX/CAP 및 조합 연산은
현재 schema에 operation/operand 역할이 없어 미구현이다. 기존 REVENUE_SUM은 범용 SUM이 아니다.

- 정의 없음/자연어 instruction만/여러 source 관계 불명확: VALUE_MISSING + COMPUTATION_DEFINITION_MISSING.
- Source found=False: VALUE_MISSING + COMPUTATION_VALUE_MISSING.
- 미등록 또는 기존 COMPUTED가 아닌 Source/RAG: UNSUPPORTED + COMPUTATION_SOURCE_UNSUPPORTED.
- 잘못된 SourceType/value_type/params/결과 숫자 타입: ERROR. 기존 per-field 격리를 유지한다.
- query_hint/instruction/constraints/location_info는 계산식으로 해석하지 않는다.
  임의 constraints.operation은 저장 계약이 아니므로 인식하지 않는다.
  rate/cap/field_key 등을 기존 Source params에 넣으면 기존 params 검증에서 ERROR로 거부한다.
- 명시적 user_inputs operand와 field dependency도 현재 계약이 없어 지원하지 않는다.
- 금액에 float/숫자 문자열/bool을 받아 임의 Decimal 변환하지 않는다. int 및 유한 Decimal만 받는다.
  평균의 Decimal 연산은 기존 Resolver 정책을 그대로 사용하며 Runtime에서 추가 rounding은 없다.
- bool은 INSURANCE_ENROLLED + BOOLEAN에만 허용한다. Source 타입과 반환 key도 검증한다.
- provenance는 기존 source_type/key/priority 필드에 남긴다. 별도 operation 필드/DB 저장은 추가하지 않는다.
- v2 당시 mapping_status 우선 차단 및 기존 routing을 유지했다. USER_INPUT/ready 정책은 아래 2026-09-18 변경을 따른다.
  required COMPUTED가 미해결이면 false, optional만 미해결이면 true가 가능하다.

새 Computed 테스트는 기존 SourceService+fake provider로 6개 계산 결과를 확인한다.
정밀 Decimal 보존, 정의/값 부재, 모호한 다중 source, 잘못된 params/type, 실패 격리, mapping gate도 검증한다.
없는 계약으로 MULTIPLY_RATE/CAP 등의 가짜 성공 fixture를 만들지 않는다.
향후 복합 계산은 Analyzer output/Persistence의 operation/operand 역할에 대한 명시적 계약부터 별도로 필요하다.
그 변경은 이번에 하지 않았다. GENERATED는 향후 비정형 생성 책임이며 산술 대체 수단이 아니다.

## v3 — GENERATED field 단위 초안 생성 (2026-09-17)

### 조사한 저장 계약

운영 DB를 조회한 결과가 아닌 코드/모델/migration 기준이다.
Analyzer의 GENERATED+RESOLVED는 sources가 필수이며 instruction은 작성 지침이다.
Persistence는 instruction 및 각 source의 required/priority/query_hint/source_params를 그대로 저장한다.
V19는 Source를 "각 필드를 작성하기 위해 어떤 데이터가 필요한지 정의", GENERATED는 여러 source 가능,
priority는 "여러 데이터가 필요한 경우 우선순위"로 명시한다. 따라서 GENERATED에서는 모든 Source가
context 근거이며 priority/id 순서로 수집한다. DIRECT fallback 정책은 변경하지 않는다.
Analyzer에는 min_length/max_length/constraints 입력이 없어 현재 Persistence는 NULL로 남긴다.
Runtime은 DB에 명시적으로 존재하는 min/max를 문자 수(len)로 검사한다. constraints는 작성 지침으로만
제공하며 임의 operation/dependency/length key를 해석하지 않는다. Writer 구조 key가 섞이면 거부한다.
GENERATED별 user input dependency 계약이 없어 user_inputs는 생성 prompt에 연결하지 않는다.

### 구조와 흐름

runtime/generated.py: GeneratedFieldContext, GenerationResponse, GeneratedFieldResolver,
GenerationClient Protocol, GmsGenerationClient. 새 하위 package/DB entity는 없다.
DocumentAgentRuntime(gms_client=...)로 fake 또는 공용 client adapter를 주입할 수 있다.
GmsGenerationClient는 실제 호출 시 app.core.gms.get_client()를 재사용한다.
새 AsyncOpenAI 인스턴스를 만들지 않고 with_options(timeout=60, max_retries=0)으로 호출한다.
JSON response_format 및 4096 output token 상한을 사용한다. incomplete finish_reason은 오류다.

GENERATED + RESOLVED + TEXT → catalog로 source 정의/params 검증 → 기존 SourceService.resolve_source
→ found=True 값만 최소 JSON 사실로 수집 → GMS 1회 → strict response 검증 → 결과.
Source의 type/key/params/value만 포함하고 metadata/DB row 전체는 보내지 않는다.
필수 Source found=False는 INPUT_REQUIRED + missing_information(SourceKey 목록), optional 부재는 생략한다.
근거가 전혀 없어도 GMS를 호출하지 않는다. Source 오류/결과 key 불일치는 field ERROR다.
여러 source는 모두 근거이며 성공 하나에서 중단하지 않는다.

Context: field_key, field_label, instruction, constraints, min_length, max_length,
structured_facts, rag_context. location_info/target_location/native_ref/element_path/hints/current_text/
input_shape 및 user_inputs 전체는 보내지 않는다. 생성 prompt/사실/응답/SDK 오류 원문은 로그하지 않는다.
source contract에 명시된 값만 보내므로 schema 자체의 개인정보 최소화 검토도 상위 계층 책임이다.

### RAG 제한과 연결 조건

Analyzer는 RAG/PROGRAM_RAG, query_hint(최대 500자), source_params={}를 제안한다.
query_hint는 RAG 검색 방향이며 다른 Source에는 허용하지 않는다.
현재 app.rag.search.search는 region/address/business_code/employee_count/open_date/annual_revenue 기반
추천 검색이다. arbitrary query + support_program_id 제한 public API가 없다.
전역 검색 후 필터링이나 Runtime SQL로 우회하지 않는다. 필수 RAG는 RAG_SCOPE_UNSUPPORTED,
optional RAG만 생략하고 정형 근거가 있으면 진행한다. 실제 RAG adapter/API를 가짜로 만들지 않았다.
향후 필요한 최소 public API는 query + support_program_id를 받고 검색 단계에서 해당 사업으로 제한한
근거 chunk를 반환하는 API다. 연결 시 query_hint 우선, 없으면 label+instruction을 deterministic query로
사용할 수 있다. 그 public API/팀원 변경은 이번에 구현하지 않았다. 현재 query_hint는 검색에 사용되지 않는다.

### 생성 결과와 실패 정책

- 성공: {"status":"GENERATED","content":"본문","missing_information":[]} → RESOLVED/string.
- 부족: {"status":"INPUT_REQUIRED","content":null,"missing_information":["필요한 정보"]} → INPUT_REQUIRED/null.
- missing_information은 ResolvedField application 결과에만 저장한다. 새로운 DB 저장은 없다.
- JSON/strict schema/빈 본문/status-content 불일치/길이 위반 → GENERATION_RESPONSE_INVALID.
- min/max 문자 길이를 검사한다. max 미지정 시 10,000자, 명시된 max에도 10,000자 운영 상한 적용.
  min이 상한보다 크면 UNSUPPORTED. 요청 JSON 50,000자, 응답 JSON 60,000자 초과는 거부한다.
- GMS network/error → GMS_REQUEST_FAILED. Source 오류 → GENERATION_SOURCE_FAILED.
- 예외 원문 대신 안전한 오류 코드/메시지만 반환한다. 오류는 field 단위로 격리하고 다음 field는 계속한다.
- repair/retry는 없다. 매 field 최대 1회 GMS 호출한다.
- prompt는 제공된 사실만 사용, 없는 숫자/실적/계획/개인정보/공고 조건 생성 금지,
  정보 부족 요청, 본문만 작성, Markdown/인사말 금지를 명시한다.
- 앞뒤 whitespace만 정리하며 본문 줄바꿈은 보존한다. 별도 formatting이나 LLM Judge는 없다.
  구조 검증은 사실성 보장이 아니므로 실제 근거 일치/초안 품질은 통합 검증 및 사용자 검토가 필요하다.
- location_info 원형과 DIRECT/COMPUTED, 자동작성 field의 mapping gate는 유지한다. USER_INPUT은 LEFT_BLANK다.
  required GENERATED가 미해결이면 false다. USER_INPUT/LEFT_BLANK는 계산에서 제외한다. Writer는 추후 RESOLVED value + location_info를 사용한다.

### 실제 GMS 단일 field 먼저 검증

아래 코드를 ai 또는 컨테이너 /app에서 one_generated.py로 저장한다. TEMPLATE_ID/USER_ID/FIELD_KEY는
실제 값으로 변경한다. 기존 DB/GMS 환경 변수가 필요하다. DB 저장 없이 대상 하나만 실행한다.
전체 문서보다 이 방법으로 먼저 근거와 초안을 확인한다. 출력은 민감 정보를 포함하므로 공유 로그에 남기지 않는다.

```python
import asyncio
from app.core import db
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest
from app.agent.documents.runtime.repository import RuntimeRepository

TEMPLATE_ID, USER_ID, FIELD_KEY = 123, 456, "business_plan"

class OneFieldRepository:
    async def load(self, template_id):
        snapshot = await RuntimeRepository().load(template_id)
        selected = [f for f in snapshot.fields if f.field_key == FIELD_KEY]
        if len(selected) != 1 or selected[0].field_type != "GENERATED" or selected[0].mapping_status != "RESOLVED":
            raise ValueError("검증할 GENERATED + RESOLVED 필드 하나가 필요합니다.")
        return snapshot.model_copy(update={"fields": selected}, deep=True)

async def main():
    await db.open_pool()
    try:
        result = await DocumentAgentRuntime(repository=OneFieldRepository()).resolve(
            DocumentRuntimeRequest(template_id=TEMPLATE_ID, user_id=USER_ID))
        print(result.model_dump_json(indent=2))
    finally:
        await db.close_pool()

asyncio.run(main())
```

```sh
python -B one_generated.py
# 단일 field 검증 이후 전체 문서 상태 확인(실제 GMS 과금 가능):
python -B -m app.agent.documents.runtime 123 456 --generate
# 본문을 확인할 때만:
python -B -m app.agent.documents.runtime 123 456 --generate --show-values
```

단일 field 예제의 ready_for_write는 선택된 field에만 해당하며 전체 문서 작성 가능 판정이 아니다.
기본 CLI는 값을 숨긴다. --generate 없는 실행은 생성 호출 단계에서 GENERATION_DISABLED/UNSUPPORTED다.
현재 없는 계약인 GENERATED user input dependency, 범용 constraints 검증, scoped RAG 연결,
내용 사실성 자동 검증, generation batch 최적화, draft 저장, Writer는 후속 작업이다.

### v3 테스트

신규 Generated 25개, Runtime 전체 83개 통과. 전체 483개 중 482개 통과, PostgreSQL 통합 1개 skip.
Source 29, Analyzer 93, Persistence 24(+PG skip 1), Preprocessing 17, Batch 36,
Normalizer 30, Parser 35, Candidate 84, OCR 51 포함. 실제 GMS/RAG/DB 호출 없이 fake/mock 사용.
전체 회귀를 위해 임시 폴더에 API/OCR 의존성을 설치했으며 production requirements는 변경하지 않았다.
Python 3.12 테스트 환경 결과이므로 배포 Docker/Python 3.11 및 실제 GMS 품질 검증은 별도다.

## v3 정책 보완 — 2026-09-18 수동 카드수수료 신청서 E2E

사용자 수동 E2E에서 DIRECT OPEN_DATE가 DATE+placeholder인 것으로 확인되었다.
Writer v1.1은 확인된 한국어 날짜 placeholder만 지원한다. Source Resolver/Analyzer/Prompt/Persistence는 변경하지 않았다.
실제 빈 서식 + fake SourceService 데이터로 Runtime → Writer → Parser를 검증했다(운영 DB/GMS/RAG 호출 없음).

- 자동작성 9: business_name, representative_name, business_brn, business_category, business_address,
  open_date, employee_count, representative_name_2, user_email.
- LEFT_BLANK 5: birth_date, consent, disagree, consent_2, disagree_2. 모두 value=null.
- optional UNSUPPORTED 2: reported_revenue_2025, card_revenue_2025. 원본 단위도 보존한다.
- 위 정형 값이 모두 있을 때 ready_for_write=true. Writer written=9/skipped=7.
- 향후 Draft API는 user_inputs를 받지 않는 계약을 기본으로 한다. USER_INPUT을 NOT_READY 입력 요구 목록에 넣지 않는다.
  API 자체는 이번에 추가하지 않았다. GENERATED의 정보 부족 INPUT_REQUIRED 정책은 그대로다.

```sh
python -B -m app.agent.documents.runtime 1 1 --show-values
```

현재 상태 확인: Runtime 정책 신규 7개, 기존 Runtime 7개 및 Generated context 검증 1개 수정.
Runtime/Generated/Computed 전체 90개 통과(Generated 25, Computed 19 포함).
Writer 70개, 전체 560개 중 559개 통과/선택 PostgreSQL 1개 skip. 실제 DB 기반 수동 재실행은 별도다.
