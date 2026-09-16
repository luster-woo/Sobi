# GMS Schema Analyzer

현재 정책은 v1.2.2이다. 이전 버전 절의 대표자 동일성 미확정 정책은 v1.2.1에서 대체되었다.

`FieldCandidate[] + SourceCatalog + GMS -> semantic schema proposal` 계층이다.
DB 조회/저장, 실제 Source resolve, RAG 검색, Writer, 값 생성, Agent orchestration을 하지 않는다.

## 파일

- enums.py: Analyzer 전용 FieldSemanticType(IGNORE 포함), MappingStatus, FieldValueType.
- models.py: source/semantic 응답 및 원래 Candidate와 결합한 최종 결과.
- catalog.py: 기존 build_registry()/SourceKey를 읽는 catalog adapter.
- prompt.py: 의미 정책, compact 입력, 실제 catalog 및 JSON schema.
- client.py: Protocol과 기존 app.core.gms client adapter.
- analyzer.py: 검증, 1회 repair, 정렬/키 충돌 해소, 원본 join.
- errors.py: 민감 원문을 제외한 SchemaAnalysisError.
- __main__.py: Candidate JSON만 읽는 manual GMS CLI.

기존 Python FieldValueType은 발견되지 않아 DB의 TEXT/NUMBER/DATE/BOOLEAN/JSON 값으로
Analyzer Enum을 정의했다. SourceType/SourceKey는 기존 Enum을 재사용한다. DB Enum/모델은 수정하지 않는다.

## API

```python
from app.agent.documents.schema_analyzer import (
    GmsSchemaAnalyzer, GmsSchemaAnalyzerClient, SourceCatalog,
)

analyzer = GmsSchemaAnalyzer(client=GmsSchemaAnalyzerClient(), source_catalog=SourceCatalog())
result = await analyzer.analyze(candidates)
for item in result.fields:
    print(item.candidate.target_location)
    print(item.analysis.model_dump())
```

입력은 한 template의 list[FieldCandidate]이다. 한 번에 전달하며 빈 목록은 외부 호출 없이 반환한다.
compact payload는 candidate_id, label, normalized_label, relation, input_shape,
current_text, context(최대 500자), confidence, 허용 scalar hints만 포함한다.
label은 자르지 않는다. location/native_ref/section_file/XML/ParsedDocument는 보내지 않는다.
문서 텍스트는 untrusted data로 취급하며 문서 내 명령을 따르지 않도록 Prompt에 명시한다.

최종 SchemaAnalysisResult.fields는 원래 순서의 JoinedField 목록이다:

- candidate: 분석 시작 시 깊은 복사한 원본 Candidate(위치/native_ref/hints 보존).
- analysis: candidate_id, semantic_type, field_key, field_label, value_type, required,
  instruction, mapping_status, sources, confidence, note.
- runtime_supported: 현재 DIRECT/COMPUTED + RESOLVED source 실행 구조 지원 여부.
  GENERATED/RAG/USER_INPUT/IGNORE/미해결은 False. True도 실제 사용자 데이터 존재나 실행 성공 보장이 아니다.

LLM 응답에는 location이 없다. 추가 필드는 extra=forbid로 거부한다.
field_label은 원문 Candidate.label로 설정하는 명시적 API 정책이다.
그 외 의미 타입/source를 코드가 조용히 교체하지 않는다.

## 의미/매핑 정책

| semantic_type | 의미 |
|---|---|
| DIRECT | 이미 존재하는 객관적 사실/속성을 그대로 조회. Source 부재도 DIRECT 가능 |
| COMPUTED | 명확한 공식/결정적 규칙으로 산출. 현재 계산기 부재도 COMPUTED 가능 |
| GENERATED | 후속 LLM이 작성할 서술형. instruction은 지침이며 실제 값이 아님 |
| USER_INPUT | 사용자 결정/선택/민감정보/직접 제공이 본질적으로 필요하거나 서비스 정책상 자동 기입 금지인 값 |
| IGNORE | 참고/서식/제목/레이아웃 등. Analyzer 전용이며 DB 저장 대상 아님 |

RESOLVED는 의미/현재 source 계약이 확정된 제안, NEEDS_REVIEW는 모호하거나 검토 필요,
UNSUPPORTED는 현재 정확한 source가 없는 경우이다. semantic confidence는 Candidate 물리 confidence와 다르다.
둘 다 0~1이며 note에는 최대 300자의 짧은 설명만 허용한다. 장문 사고 과정을 요구하지 않는다.

IGNORE/USER_INPUT의 sources는 비어야 한다. IGNORE field_key는 null이다.
그 외는 snake_case field_key와 value_type을 요구한다.
DIRECT/COMPUTED/GENERATED의 RESOLVED는 sources가 필요하다.
GENERATED에 sources가 없으면 NEEDS_REVIEW여야 한다.
GENERATED+PROGRAM_RAG는 의미 매핑 제안이 가능하지만 실제 RAG는 stub이며 실행하지 않는다.

USER_NAME은 기존 postgres 매핑상 users.name이다. 현재 서비스 도메인 정책상 등록 사용자는
해당 사업체의 소유자/대표자이므로 대표자 및 대표자 정보 영역 성명은 DIRECT/RESOLVED로 USER_NAME을 사용한다. 개인 거주지와 사업장 주소도 구분하도록 안내한다.
민감 필드 USER_INPUT, 카드매출과 일반매출 구분 등 의미 정책은 Prompt 책임이며 fake 테스트가
실제 LLM의 정확한 준수를 입증하지는 않는다. 실제 응답 검수가 필요하다.

## Source catalog와 validation

기존 SourceKey를 순회하며 build_registry().get(key)에서 SourceType/FieldType을 읽는다.
SourceKey 목록을 Analyzer에 복사하지 않는다. ACCOUNT는 제외한다.
Resolver를 호출하지 않고 기존 구현 종류를 조사하여 파라미터 계약을 연결한다:

- AmountResolver -> 기존 PeriodParams(months: strict positive int).
- direct/business_age/insurance_enrolled/rag_placeholder -> 기존 EmptyParams.
- 신규 알 수 없는 resolver는 명시적 adapter 추가 전 실패한다.

Prompt에 catalog를 제공하고 응답 Enum 검증 + key/type 조합 + 파라미터 검증을 반복한다.
DIRECT는 DIRECT key, COMPUTED는 COMPUTED key만 허용한다. query_hint는 RAG에만 허용한다.
없는 key나 임의 year/start/end 파라미터는 거부한다.
현재 AmountResolver는 현재 월을 제외한 직전 완료 N개월만 지원한다.
label/current_text에 명시적인 4자리 연도/전년도/작년이 있으면 rolling mapping을 검증 실패로 처리한다.
다른 후보의 연도일 수 있는 context는 이 자동 검사에서 제외한다.
이 검사는 전체 자연어 기간 의미를 해석하는 장치가 아니며, 그 외 모호한 기간은 GMS와 검수 책임이다.

## 응답 처리와 호출

- 정확히 {"fields": [...]} JSON을 받는다. 전체 JSON code fence만 최소 허용한다.
- unknown/duplicate/missing candidate_id, 잘못된 enum, source 계약 위반, 위치 주입을 거부한다.
- validation 실패만 최대 1회 repair(총 2회 호출). 원문 응답이나 Pydantic input은 재전송하지 않는다.
- repair에는 오류 종류 요약과 원래 전체 후보를 제공한다. 2회 실패하면 SchemaAnalysisError.
- 네트워크/SDK 실패는 별도 GMS_REQUEST_FAILED이며 Analyzer에서 재시도하지 않는다.
- 공유 client.with_options(timeout=60, max_retries=0)를 사용하며 공유 설정을 수정하지 않는다.
- 각 client await에도 75초 timeout을 둔다. 응답은 최대 1,000,000자로 제한한다.
- 외부 오류/로그에 API key, SDK exception, GMS 원문, stack trace를 출력하지 않는다.
- API key/SDK import는 실제 호출 시점에 필요하다. fake/빈 입력은 설치나 키가 필요 없다.

app.core.gms.get_client()/DEFAULT_MODEL과 기존 GMS_API_KEY/GMS_BASE_URL convention을 재사용한다.
기존 공용 호출에서 확인한 response_format=json_object를 사용한다. Pydantic JSON schema는 Prompt에 넣고
응답을 로컬 검증한다. strict JSON Schema의 GMS 지원 여부는 확인되지 않아 강제하지 않는다.
SDK/패키지/설정 변경이나 자동 설치는 하지 않았다.

## field_key 충돌

원래 Candidate 순서로 처리하고 중복 key에 _2, _3 ...를 부여한다.
이미 다른 후보가 가진 key는 예약해 충돌을 피한다.
예: name, name, name_2 -> name, name_3, name_2.
IGNORE는 field_key가 없으며 후보 순서/위치를 삭제하지 않는다.

## Manual integration

ai 디렉터리에서 기존 .env의 GMS_API_KEY/GMS_BASE_URL을 사용한다. 키를 CLI 인자로 전달하지 않는다.
다음 명령은 실제 GMS에 Candidate 텍스트를 전송하며 비용이 발생한다. 이번 작업에서는 실행하지 않았다.

```bash
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/logistics.json" --json
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/birth.json" --json
```

--json을 생략하면 후보별 요약을 출력한다. --model로 공용 기본 모델을 호출별 override할 수 있다.
입력은 Candidate CLI의 JSON 배열이며 Parser/Extractor를 다시 실행하지 않는다.
원래 위치가 포함된 최종 JSON은 로컬 출력용이다. 외부 공유 전 내용을 검토한다.

```bash
python -B -m unittest discover -s tests -p "test_schema_analyzer.py" -v
python -B -m unittest discover -s tests -p "test_*.py"
```

2026-09-16: Analyzer 43개, 전체 221개 통과. Source mapping/params/ID/repair/순서/위치/
민감 오류 처리와 adapter는 fake/mock으로 검증했다. 실제 semantic 정확도 및 GMS 호환성은 manual TODO이다.
다음 단계: 실제 3개 결과 검수 -> source mapping 보정 -> schema/source 저장 Service ->
preprocessing orchestration -> RAG 연결 -> HWPX Writer. SAME_CELL/checkbox grouping은 별도 후속이다.


## v1.1 — 실제 GMS 실패 기반 최소 보완 (2026-09-16)

실제 card.json의 repair 응답에서 16개 필드 중 15개가 mapping_status=USER_INPUT을
반환하여 Enum 검증에 실패했다. 빈칸/helper를 USER_INPUT/IGNORE 근거로 삼는 의미 오판도 확인했다.
GMS/네트워크 실패와 별개이며 이번 보완에서 실제 GMS 재호출은 하지 않았다.

### Prompt

- semantic_type(DIRECT/COMPUTED/GENERATED/USER_INPUT/IGNORE)와
  mapping_status(RESOLVED/NEEDS_REVIEW/UNSUPPORTED)를 앞부분과 출력 schema 직전에 반복한다.
- RESOLVED는 의미 분류와 필요한 매핑 판단이 확정된 상태다. USER_INPUT/IGNORE도
  RESOLVED 및 sources=[]가 정상이다. 이 조합은 기존 모델이 이미 허용해 모델 변경은 없다.
- NEEDS_REVIEW는 의미/SourceKey 불확실, UNSUPPORTED는 의미는 알지만 정확한 자동화 수단 부재다.
- label/context로 실제 항목 판단 -> Source Catalog 우선 -> 생성형 -> 사용자 결정 -> 미지원 판단.
  서명/동의/계좌 등 자동 결정 금지 정책은 Source-first보다 우선한다.
- current_text/target_kind/helper/placeholder/unit_suffix/relation/input_shape는 물리적 구조이다.
  빈칸은 USER_INPUT 근거가 아니며 helper는 작성 지침이다. 낮은 물리 confidence만으로 IGNORE하지 않는다.
- 명/원/(원)은 현재 입력된 값이 아닌 suffix이다.
- 업체명, 업종 helper, 근로자 unit suffix, 동의, 계좌번호, 참고자료, 미지원 카드매출의
  7개 의미 예시를 제공한다. 예시 ID는 실제 응답에 포함하지 않도록 명시한다.
- 고정 연도 != 최근 12개월 negative example을 유지한다.
- Python이 label을 보고 semantic/source를 자동 교체하는 규칙은 추가하지 않았다.

### Repair와 safe logging

repair는 문자열에서 구조화된 객체로 변경했다. 전체 compact candidates는 그대로 전달하며
부분 patch가 아닌 모든 후보의 전체 결과를 다시 요청한다. 최대 1회 repair는 유지한다.

```json
{
  "repair": {
    "message": "이전 응답이 validation에 실패했습니다. errors를 수정하여 전체 후보의 전체 결과를 다시 반환하세요. 부분 patch는 허용하지 않습니다.",
    "errors": [{
      "candidate_id": "candidate_001",
      "path": "mapping_status",
      "code": "SCHEMA_CONTRACT_ENUM",
      "received": "USER_INPUT",
      "allowed": ["RESOLVED", "NEEDS_REVIEW", "UNSUPPORTED"]
    }]
  }
}
```

- repair.py에서 Pydantic error를 정규화한다. 최대 24개 오류를 전달한다.
- source_key 오류는 sources[0].source_key 경로와 catalog 기반 허용 key, 잘못된 key를 제공한다.
- API key/개인정보/stack trace/원문 응답/Pydantic 상세 메시지는 전달하지 않는다.
- received는 짧은 대문자 Enum token만 허용하고 나머지는 <redacted> 처리한다.
- path는 알려진 schema 필드만 허용하고 알 수 없는 이름은 <unknown> 처리한다.
- candidate_id는 입력에 존재하는 candidate_N 또는 cN 형식만 전달하고 그 외는 null이다.
- debug 로그는 attempt/code/candidate_id/path만 포함한다. received/allowed/label/context는 로그하지 않는다.
  기존 CLI는 logging 설정을 바꾸지 않으며 호출 애플리케이션에서 해당 logger DEBUG 설정 시 볼 수 있다.
- 최종 외부 오류 SCHEMA_VALIDATION_FAILED 계약은 그대로다.

### 회귀 검증

기존 43개 테스트를 수정 없이 유지하고 test_schema_analyzer_v11.py에 18개를 추가했다.
실제 실패 응답 fixture는 label/note/instruction을 제거한 16개 semantic 레코드만 보관한다.
mapping_status enum 오류 15개를 재현하고 repair 성공/동일 오류 반복 실패를 검증한다.
Prompt 예시는 모델 검증하며, empty/helper/unit suffix 정상 fake 응답은 코드가 다른 의미로 바꾸지 않는다.
USER_INPUT/IGNORE RESOLVED, DIRECT UNSUPPORTED, source allowlist, fixed period,
ID 무결성, 안전한 로그/repair 정보도 검증한다.

실제 실행: **Analyzer 61개 / 전체 239개 통과**.
Fake 테스트는 실제 LLM의 의미 정확도를 보장하지 않는다. 다음 명령으로 실제 card.json을 재검증한다.

```bash
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json > "/data/test/schema-card-v11.json"
python -B -m unittest discover -s tests -p "test_schema_analyzer*.py"
```

Source Catalog/Resolver/Registry, 모델/Enum, 공용 GMS, Candidate/Parser/Normalizer는 수정하지 않았다.
GMS transport/JSON mode, 재시도 횟수, DB/Writer 범위도 그대로다.


## v1.2 — 불확실한 DIRECT와 mapping_status 분리 (2026-09-16)

사용자 실제 통합 결과에서 candidate_002/008이 최초와 repair 모두 semantic_type=NEEDS_REVIEW를
반환했다. 다른 주요 DIRECT 매핑은 개선됐으므로 전체 semantic 정책은 유지하고 표현만 보완한다.

- Prompt의 모든 NEEDS_REVIEW/UNSUPPORTED 문장을 점검했다. 생략된 속성명을 mapping_status로 명시한다.
- 질문 A(값을 얻는 방식)는 semantic_type 5개 값, 질문 B(분류/매핑 확정 상태)는 mapping_status 3개 값으로 분리한다.
- NEEDS_REVIEW/UNSUPPORTED는 필드 종류가 아니며 semantic_type=RESOLVED도 금지한다고 명시한다.
- 대표자: semantic_type=DIRECT, mapping_status=NEEDS_REVIEW, sources=[] 예시 추가.
  field_key=representative_name은 일반 snake_case key이며 새 SourceKey가 아니다.
- source 부족 서술형: semantic_type=GENERATED, mapping_status=NEEDS_REVIEW, sources=[] 예시 추가.
- 고정 연도 미지원: semantic_type=DIRECT, mapping_status=UNSUPPORTED, sources=[] 유지.
- 유효 조합 표를 추가하되 기존 모델 계약도 명시한다. GENERATED+UNSUPPORTED는 source proposal이 있을 때만,
  GENERATED+sources=[]는 mapping_status=NEEDS_REVIEW만 허용한다. validation 모델은 변경하지 않는다.
- repair message 첫머리에 semantic_type 오류이면 allowed에서 반드시 선택하고 상태값을 넣지 말라고 명시한다.
  errors 객체/최대 1회 repair/외부 오류/로그 정책은 유지한다.

### Strict JSON Schema 조사 결과

요청 범위대로 저장소 코드와 현재 client interface만 조사했으며 웹/실제 API 호출/SDK 설치를 하지 않았다.
공용 app.core.gms는 AsyncOpenAI를 생성하고 chat.completions.create에 response_format을 전달하는 구조다.
Analyzer와 기존 RAG/스크립트 호출은 모두 json_object이고 json_schema 사용 사례나 GMS capability 선언은 없다.
조사에 사용한 로컬 Python 런타임에는 openai SDK가 없어 SDK 내부 타입 구현도 확인할 수 없었다.
SDK interface에 옵션을 전달할 수 있는 것과 GMS endpoint가 실제 strict schema를 지원하는 것은 별개다.
따라서 **GMS strict JSON Schema 사용 가능 여부는 미확인**이다. 미지원으로 단정하지 않는다.
json_object 및 Prompt -> JSON parse -> Pydantic -> repair를 유지한다. 공용 client 수정은 필요하지 않았다.
기본 모델 gpt-4.1-mini와 호출 옵션은 변경하지 않았다.

### 검증

신규 test_schema_analyzer_v12.py 9개 추가. 기존 Analyzer 61개 유지.
**Analyzer 총 70개 / 전체 248개 통과**.
DIRECT/GENERATED+NEEDS_REVIEW, DIRECT+UNSUPPORTED, 잘못된 semantic Enum 거부,
실제 두 후보의 반복 실패, 구체적인 repair와 성공, few-shot/모호한 문장 제거를 확인한다.
기존 adapter의 json_object 테스트도 계속 통과한다. strict 지원이 확인되지 않아 새 strict adapter는 추가하지 않는다.

```bash
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json > "/data/test/schema-card-v12.json"
```

실제 재호출은 이번 작업에서 하지 않았다. Prompt는 확률적 모델 출력의 Enum 준수를 보장하지 않으며
반복 실패 시 그대로 SchemaAnalysisError를 반환한다. Python의 label 기반 강제 보정은 없다.


## v1.2.1 — 대표자 도메인 정책과 USER_INPUT value_type (2026-09-16)

등록 사용자는 자신의 사업체를 등록하고 신청서를 작성하는 사업자 소유자/대표자라는
사용자 확정 도메인 정책을 Prompt에 반영했다. 대표자/대표자명/대표자 성명 및
context가 대표자 정보를 가리키는 성명은 USER / USER_NAME, DIRECT, RESOLVED, TEXT로 제안한다.
기존 대표자 검토 필요 문장은 제거했다. 대표자와 대표자 context 성명의 few-shot도 수정/추가했다.
일반 성명은 label+context로 판단하며 자녀/수임자 이름에 USER_NAME을 적용하지 않는다.

semantic_type(값 획득 방식)과 value_type(데이터 형식)은 독립적이다.
USER_INPUT이어도 생년월일/출산일은 DATE, 동의 여부는 BOOLEAN,
계좌번호/주민등록번호는 TEXT이다. 생년월일은 source가 없어 USER_INPUT/RESOLVED/sources=[]를 유지한다.
물리 input_shape가 SHORT_TEXT여도 의미상 DATE를 선택할 수 있다.
생년월일/출산일 few-shot을 추가했다. 이들은 Prompt 예시이며 Python 분류 규칙이 아니다.

Prompt 외 Analyzer 실행 구조, models/Enum/client/catalog/repair/Source는 변경하지 않았다.
기존 70개 테스트를 유지하면서 정책과 직접 충돌하는 3개 테스트 기대값을 수정하고 신규 8개를 추가했다.
**Analyzer 78개 / 전체 256개 통과**. fixed-year/allowlist/ID/repair/location 등 기존 회귀도 통과했다.
실제 GMS 호출은 하지 않았다. 사용자 보고상 card.json v1.2는 전체적으로 정상이며
다음 manual 대상은 logistics.json, birth.json이다. Fake 테스트는 실제 의미 분류 정확도를 보장하지 않는다.


## v1.2.2 — 객관적 사실과 현재 자동화 지원 분리 (2026-09-16)

semantic_type은 본질적인 획득 방식이며 catalog/runtime 구현 여부가 아니다.
SourceKey 없음 -> USER_INPUT 자동 판단을 금지한다. 객관적 사실은 DIRECT+UNSUPPORTED+sources=[],
명확한 결정적 계산은 COMPUTED+UNSUPPORTED+sources=[]가 가능하다. 모호한 의미/시점은 NEEDS_REVIEW다.
사용자 결정/선택/직접 제공 또는 기존 서비스 정책의 민감/계좌/동의 등은 USER_INPUT을 유지한다.
생년월일/출산일 USER_INPUT+DATE 정책도 유지한다.

Prompt 보완:

- USER_INPUT/UNSUPPORTED 결정 전 전체 catalog를 label+context와 다시 대조한다.
- 사업장 주소/사업체 주소는 BUSINESS_ADDRESS. 거주지/수임자/자녀 주소로 대신하지 않는다.
- 등록 사용자는 본인 신청자다. 신청인 영역 성명/신청자명은 USER_NAME.
  타인 성명은 제외하고 label만으로 본인임을 판단하지 않는다.
- 법인등록번호/주요생산품/홈페이지/운반비 등은 객관적 사실이다. source가 없으면 DIRECT+UNSUPPORTED.
- 설립연월일/법인 설립일과 OPEN_DATE의 동일성을 가정하지 않는다. DIRECT+NEEDS_REVIEW 또는 UNSUPPORTED.
  개업일/사업 시작일 매핑은 유지한다.
- 종업원수(2025)를 현재 EMPLOYEE_COUNT로 대신하지 않는다. historical 값은 DIRECT+UNSUPPORTED.
- 지원금신청액의 운반비 50%/최대 5백만원 규칙이 명확하면 COMPUTED+UNSUPPORTED+NUMBER.
  Python 계산 로직이나 새 SourceKey는 추가하지 않는다.
- 전년도 매출액 또는 월 매출액은 DIRECT+NEEDS_REVIEW 우선. 기간이 특정돼도 미지원이면 UNSUPPORTED.
- BUSINESS_CATEGORY의 실제 postgres 매핑은 단일 mc.name이다. 업태/종목 각각과 정확히 동일하다고
  가정하지 않으며 불확실하면 DIRECT+NEEDS_REVIEW. 기존 업종/업태 매핑은 정확한 동일성 전제다.

9개 few-shot 예시를 추가했다. 위 규칙은 Prompt 의미 정책이며 Python label별 보정/추가 검증은 없다.
특히 historical employee count나 설립일의 잘못된 GMS 매핑을 코드에서 새로 차단하는 기능은 추가하지 않았다.
기존 fixed-period AmountResolver 검증/Source allowlist 등은 그대로 유지한다.

신규 test_schema_analyzer_v122.py 15개, 기존 테스트 변경 없음.
**Analyzer 93개 / 전체 271개 통과**. 실제 GMS는 호출하지 않았다.
Fake 테스트는 제안 모델이 보존되는지와 Prompt 예시를 검증하며 실제 의미 정확도는 manual 검토가 필요하다.
