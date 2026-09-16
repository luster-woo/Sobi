# Schema Persistence

`SchemaAnalysisResult`를 기존 PostgreSQL schema/source 테이블의 최신 snapshot으로 저장한다.
의미 판단, Source 조회, GMS, Runtime, Writer, CLI/API는 수행하지 않는다.

```python
from app.agent.documents.schema_persistence import DocumentSchemaPersistenceService

# 애플리케이션의 기존 app.core.db pool이 열려 있는 async 호출 환경
saved = await DocumentSchemaPersistenceService().persist(template_id, analysis_result)
print(saved.model_dump())  # template_id, field_count, source_count, ignored_count
```

## 기존 DB 조사 및 매핑

V19/V22 migration과 app.core.db, Source Postgres provider를 확인했다.
사용자가 직접 적용하는 V23 계약인 `mapping_status VARCHAR(20) NOT NULL` 컬럼을 요구한다.
허용값은 RESOLVED/NEEDS_REVIEW/UNSUPPORTED이며 default 없이 매 INSERT에 명시적으로 전달한다.
V23 적용 전에는 저장할 수 없다. 이 모듈은 migration을 생성하거나 실행하지 않는다.
관련 기존 ORM/CRUD/Writer/location_info JSON 계약은 없다. 새 연결 계층 없이 기존
`acquire()`와 psycopg `conn.transaction()`을 사용한다. 테스트의 acquire 주입은 기존 provider 방식이다.

| 입력 | 실제 document_field_schema 컬럼 |
| --- | --- |
| template_id | template_id |
| analysis.field_key | field_key (100자 이하) |
| analysis.field_label | field_label (null 불가, 255자 이하) |
| IGNORE 제외 후 list 순서 | field_order (0부터 연속) |
| analysis.semantic_type | field_type |
| analysis.value_type | value_type |
| analysis.mapping_status.value | mapping_status |
| analysis.required / instruction | required / instruction |
| candidate의 Writer 위치/구조 정보 | location_info |

Analyzer가 field_label을 candidate.label로 확정하므로 그대로 저장하며 null/길이 초과는 오류다.
min_length/max_length/constraints 입력은 없으므로 컬럼 기본 정책인 NULL을 유지한다.
전체 typed result를 재검증해 변경된 모델의 null key/target_location도 DB 변경 전에 거부한다.
중복 field_key, candidate ID 불일치도 거부한다. Source 의미 검증/매핑은 다시 하지 않는다.

## location_info v1 계약

```json
{
  "version": 1,
  "target_location": {"type": "TABLE_CELL", "section_index": 0, "block_index": 1,
    "table_index": 0, "row_index": 2, "column_index": 1, "paragraph_index": null,
    "native_ref": {"element_path": [0, 1, 2]}},
  "current_text": "원",
  "input_shape": "NUMBER",
  "hints": {"insertion_mode": "BEFORE_SUFFIX", "unit": "원"}
}
```

DB가 location_info를 실제 작성 위치 JSONB로 정의하고 기존 소비자 계약이 없으므로
Writer target 구조 metadata를 포함하는 versioned envelope로 정했다.
`StoredLocationInfo.model_validate(row['location_info'])`로 복원한다.
target_location의 null/index/native_ref 중첩 구조를 보존하며 label_location은 저장하지 않는다.
current_text/input_shape/hints는 원형을 보존한다. constraints에 섞지 않는다.
향후 Writer는 이 v1 계약을 명시적으로 사용해야 한다.

## mapping_status와 Runtime 책임

Analyzer가 정한 mapping_status를 `.value` 문자열로 전용 DB 컬럼에 영구 저장한다.
IGNORE는 기존처럼 field 자체를 제외한다. 다른 필드는 sources가 없어도 semantic_type과
mapping_status를 변경하지 않는다. location_info/constraints에 의미 상태를 넣지 않는다.

runtime_supported는 DB에 저장하지 않으며 다른 JSON에도 넣지 않는다.
향후 Runtime Agent가 mapping_status, semantic_type(field_type), document_field_source,
현재 Source Registry capability를 기준으로 실행 시점에 판단할 파생값이다.
이번에는 Runtime 계산 함수도 구현하지 않는다. RESOLVED가 실제 값 조회 성공을 보장하지 않는다.

- Analyzer: semantic 판단
- Persistence: validate / transform / persist
- Runtime: 현재 실행 가능 여부 판단

## 저장/transaction 정책

- IGNORE는 제외한다. 나머지는 source가 0개여도 저장하고 의미 분류를 유지한다.
- template 존재와 연결된 program_document.type='작성용'을 확인한다.
- 한 transaction에서 template/program_document 행을 FOR UPDATE로 잠그고 기존 field를 삭제한다.
  V19의 ON DELETE CASCADE로 기존 source도 삭제된다.
- 새 field의 RETURNING id에 모든 source를 연결한다. priority는 전달된 값을 보존하며 재정렬하지 않는다.
  source_params는 parameter binding과 ::jsonb로 저장한다.
- 동일 template의 동시 저장은 행 잠금으로 직렬화한다. 마지막으로 잠금을 획득해 성공한 요청이 최신 snapshot이다.
- 빈/전부 IGNORE 결과도 기존 snapshot을 비운다. 다른 template은 삭제하지 않는다.
- 중간 SQL 실패/commit 실패는 전체 rollback한다. schema/source ID는 재생성된다.
- 오류 코드는 INVALID_SCHEMA_INPUT, DOCUMENT_TEMPLATE_NOT_FOUND, DOCUMENT_NOT_WRITABLE,
  SCHEMA_PERSISTENCE_FAILED. SQL/원문/접속정보는 외부 오류에 포함하지 않는다.

## 테스트

ai 디렉터리에서:

```sh
python -B -m unittest discover -s tests -p 'test_schema_persistence*.py'
python -B -m unittest discover -s tests -p 'test_schema_analyzer*.py'
python -B -m unittest discover -s tests
```

단위 테스트는 외부 DB/GMS 없이 fake connection/transaction으로 실행한다.
선택 PostgreSQL 테스트는 V19/V22 및 사용자가 관리하는 V23이 적용된 **전용 테스트 DB**의 DSN을
SCHEMA_PERSISTENCE_TEST_DSN에 설정하고 같은 명령으로 실행한다. 기존 psycopg 의존성을 사용한다.
운영 DSN은 사용하지 않는다. public 테이블 정의를 LIKE INCLUDING ALL로 복제한 TEMP field/source
테이블과 최소 TEMP 부모 테이블을 사용하고 FK cascade를 TEMP 테이블에 추가한다.
mapping_status 세 상태 저장/조회, JSONB round-trip, 재저장/cascade,
PostgreSQL JSONB 오류 후 mapping_status를 포함한 이전 snapshot rollback을 확인한다.
public 데이터 변경/프로그램 설치는 하지 않는다. 전체 migration 적용이나 실제 pool 동시성 검증을 대체하지 않는다.
