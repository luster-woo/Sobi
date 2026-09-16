# 문서 Source 기반 구조

## 범위와 기존 코드 보호

문서 Agent의 데이터 조회 기반만 구현한다. LLM, 루프, Tool Calling, 문서 파싱/작성,
벡터 검색은 포함하지 않는다. 기존 `app/main.py`, `core/`, `rag/`, 공용 설정,
DB 마이그레이션은 변경하지 않는다.

분석한 기존 구조:
- FastAPI → `app.core.db.acquire()` → psycopg 비동기 풀 → PostgreSQL.
- 기존 `app.core.config`가 저장소 루트 .env를 읽는다.
- 따라서 새 HTTP Client/ORM/DB 풀/설정을 만들지 않고 기존 풀을 재사용한다.
- Spring의 V1 이후 마이그레이션과 엔티티에서 실제 테이블/관계를 확인했다.
- 작업 중인 V19 문서 스키마는 읽기만 했다.
- README의 파트 간 import 금지 규칙에 따라 agent에서 rag를 import하지 않는다.
  업력의 간단한 달력 계산은 Agent resolver에서 독립적으로 수행한다.

## 파일

| 파일 | 역할 |
|---|---|
| `app/agent/__init__.py` | Agent 패키지 |
| `sources/__init__.py` | Source 패키지 |
| `sources/enums.py` | SourceType, FieldType, SourceKey |
| `sources/models.py` | 요청/컨텍스트/결과와 파라미터 검증 모델 |
| `sources/errors.py` | 외부로 전달 가능한 오류 계약 |
| `sources/provider.py` | DataProvider Protocol, 논리 데이터 DTO |
| `sources/postgres.py` | 기존 DB 풀을 재사용하는 읽기 전용 Provider |
| `sources/registry.py` | Resolver Protocol과 Registry |
| `sources/defaults.py` | 모든 SourceKey의 타입/처리 함수 등록 |
| `sources/resolvers.py` | 직접 조회, 업력/매출/세금/보험 계산 |
| `sources/service.py` | 단건/일괄 조회와 오류 경계 |
| `tests/test_document_sources.py` | DB 없는 단위 테스트 |
| 이 문서 | 사용법, 계산 정책, 남은 연결 작업 |

## 문서 작성 대상 도메인 규칙 (필수 TODO)

- 문서 Agent는 지원사업의 program_document만 처리한다. loan_document는 대상이 아니다.
- 향후 DocumentTemplate 생성 또는 Agent 진입 시 program_document의 존재를 확인하고,
  반드시 program_document.type == '작성용'인 경우에만 진행해야 한다.
- '제출용', 알 수 없는 타입, 존재하지 않는 문서는 작성 처리를 거부해야 한다.
- PROGRAM_TYPE은 지원사업 자체의 유형이며 program_document.type을 대신할 수 없다.
- 아직 DocumentTemplate 생성 Service와 Agent 진입 코드가 없어 새 Service는 만들지 않았다.
  위 검사는 해당 진입점을 구현할 때 필수로 적용하고, 부재/제출용/다른 타입 거부 테스트를 추가한다.
- Normalizer는 파일 형식 계층이다. 작성용/제출용 검사 책임을 Normalizer에 넣지 않는다.
- DB migration의 기존 허용값은 변경하지 않는다. 문서 Agent의 소스는
  USER / BUSINESS / MYDATA / PROGRAM / RAG이고, ACCOUNT는 향후 확장용 Enum만 유지한다.

## 실행 흐름

`document_field_source`의 논리 필드
→ `SourceResolveRequest`
→ `SourceService`
→ `SourceRegistry`에서 키 및 SourceType 확인
→ `SourceResolver(context, request, provider, today)`
→ `DataProvider.fetch()`
→ 실제 데이터 조회 / resolver 계산
→ `SourceResolveResult`.

source_params는 request를 통해 Resolver로 전달한다. 여러 source가 같은 Context를
사용해도 각 source_params는 독립적이다. 컨텍스트에 파라미터를 중복 저장하지 않는다.
DB 테이블/컬럼은 postgres.py 내부에만 있고, Provider는 SourceKey로 변환된 값을 반환한다.

DIRECT는 저장된 값 조회, COMPUTED는 업력/금액 집계/보험 가입 여부 계산이다.
계좌 자동기입은 구현을 보류한다. SourceType.ACCOUNT만 향후 확장용으로 유지한다.
GENERATED/USER_INPUT Enum만 준비하며 생성/사용자 입력 처리기는 구현하지 않는다.
PROGRAM_RAG는 향후 GENERATED 용도로 등록된 명시적 미구현 처리기다.

## 사용 예

기존 FastAPI lifespan이 DB 풀을 연 뒤, 신뢰된 서비스 코드에서 호출한다.
새 API는 등록하지 않았다.

```python
from app.agent.sources.enums import SourceKey, SourceType
from app.agent.sources.models import SourceResolveContext, SourceResolveRequest
from app.agent.sources.postgres import PostgresDataProvider
from app.agent.sources.service import SourceService
from app.agent.sources.errors import SourceError

service = SourceService(PostgresDataProvider())
context = SourceResolveContext(user_id=1)

sources = [
    SourceResolveRequest(
        source_type=SourceType.BUSINESS,
        source_key=SourceKey.BUSINESS_NAME,
    ),
    SourceResolveRequest(
        source_type=SourceType.MYDATA,
        source_key=SourceKey.REVENUE_SUM,
        source_params={"months": 12},
    ),
]
try:
    results = await service.resolve_sources(context, sources)
    payload = [item.model_dump(mode="json") for item in results]
except SourceError as exc:
    payload = {"error": exc.as_dict()}
```

일괄 결과는 입력 순서의 목록이다. 같은 키에 months=6, months=12를 요청하더라도
덮어쓰지 않는다. 잘못된 요청/시스템 오류는 중단하며, 엔티티/값 부재는 결과로 유지한다.
여러 번의 DB 조회를 수행하므로 일괄 조회 전체가 하나의 DB 스냅샷이라는 보장은 없다.

DB의 document_field_source 행을 읽는 Repository는 이번 범위에 포함하지 않는다.
연결 시 ORM/행 객체 전체를 모델에 넣지 말고 다음 논리 필드만 전달한다.
V19에서 허용하는 NULL source_params와 RAG source_key는 경계에서 정규화한다.

```python
source = SourceResolveRequest(
    source_type=row["source_type"],
    source_key=row["source_key"] or (
        "PROGRAM_RAG" if row["source_type"] == "RAG" else None
    ),
    source_params=row["source_params"] or {},
    query_hint=row["query_hint"],
)
```

알 수 없는 문자열/타입은 Pydantic ValidationError로 입력 단계에서 거부한다.
호출 경계에서는 ValidationError를 그대로 LLM에 전달하지 않고 입력 오류로 변환해야 한다.
모델에 정의되지 않은 필드는 거부하므로 DB의 id/required/priority는 별도 관리한다.

## 조회/계산 정책

- USER: user_id 필수. 탈퇴한 사용자 제외.
- BUSINESS/MYDATA: user_id 필수. 사용자 확인 후 business_info.user_id로 사업체 조회.
  사업체가 없으면 BUSINESS_NOT_FOUND, 둘 이상이면 DATA_INTEGRITY_ERROR.
  Context는 user_id, support_program_id만 가진다.
- ACCOUNT: SourceType Enum만 유지하며 계좌 SourceKey/조회 구현은 없다.
- PROGRAM: support_program_id 필수.
- ID는 양의 정수만 허용. ID는 인증된 호출자가 공급해야 한다.
  이 내부 모듈 자체가 HTTP 인증/마이데이터 동의 확인을 구현하지는 않는다.
- BUSINESS_CATEGORY는 minor_code.name. BUSINESS_AGE_MONTHS는 완료된 달력 개월 수.
  미래 개업일은 계산 오류다. 오늘 날짜 함수는 테스트에서 주입 가능하다.
- MYDATA는 user_id → business_info.user_id → business_info.brn → mydata.brn
  → mydata_tax/mydata_insurance로 연결한다.
  사업체의 business_tax를 섞어 사용하지 않는다.
- months는 필수인 양의 정수다. 문자열, bool, 실수, 추가 파라미터는 거부한다.
- 최근 N개월 = 이번 달을 제외한 완료된 N개 달력 월.
  2026-09-15 기준 months=12는 [2025-09-01, 2026-09-01).
  Provider는 이 범위만 조회한다.
- 합계는 원 단위 정수, 평균은 합계 / 요청 개월 수인 Decimal이다.
  Decimal은 Pydantic JSON 직렬화 시 문자열로 표현되어 정밀도를 보존한다.
- 전체 월 데이터가 없으면 found=False. 일부 월 누락, 같은 월 중복은 계산 오류다.
  누락된 월을 0원으로 간주하거나 관측 월 수만으로 평균을 내지 않는다.
- INSURANCE_LIST는 가입 목록 [{policy_id, title}], INSURANCE_ENROLLED는 가입 목록 존재 여부다.
  전체 의무보험 충족 판정은 아니다. 연결된 마이데이터가 있으나 보험이 없으면
  []와 False를 found=True로 반환한다.
- PROGRAM_RAG는 query_hint를 받을 수 있으나 SOURCE_NOT_IMPLEMENTED를 발생시킨다.
  DB/LLM/검색은 호출하지 않는다.
- 단순 NULL은 DATA_NOT_FOUND. 0, False, []는 유효한 조회 결과다.

## 오류 계약

| 상황 | 표현 |
|---|---|
| 알 수 없는 SourceKey 문자열 | 요청 모델 ValidationError |
| Registry에 없는 키 | UNSUPPORTED_SOURCE_KEY |
| SourceType 불일치 | SOURCE_TYPE_MISMATCH |
| 필요한 ID 없음 | MISSING_CONTEXT_ID |
| 필요한/잘못된 파라미터 | INVALID_SOURCE_PARAMS (필드와 검증 유형 포함) |
| 사용자/사업체/공고/마이데이터 부재 | found=False + *_NOT_FOUND |
| 값 자체 부재 | found=False + DATA_NOT_FOUND |
| 사용자에게 사업체가 둘 이상 연결됨 | DATA_INTEGRITY_ERROR |
| 기간 데이터 누락/중복, 미래 개업일 | CALCULATION_IMPOSSIBLE |
| RAG 미연결 | SOURCE_NOT_IMPLEMENTED |
| DB 등 시스템 장애 | SOURCE_SYSTEM_ERROR |

Service를 외부 호출 경계로 사용한다. Provider를 LLM에 직접 노출하지 않는다.
외부 응답에는 SourceError.as_dict()만 전달하며 traceback, repr(original_exception),
Pydantic errors()의 input 값 등을 넣지 않는다.

## 새 SourceKey 추가

1. enums.py의 SourceKey에 동일한 문자열 값을 추가한다.
2. DIRECT면 postgres.py의 해당 고정 매핑에 DB 컬럼을 연결한다.
3. COMPUTED면 resolvers.py에 SourceResolver Protocol과 동일한 비동기 함수를 추가한다.
4. 필요한 원천 데이터가 없다면 provider.py 계약과 Provider 구현을 확장한다.
5. defaults.py에 SourceType/FieldType/resolver를 등록한다.
6. FakeProvider 기반 테스트를 추가한다.

핵심 Service/Registry의 조건 분기는 수정하지 않는다. Spring 내부 API로 획득 방식이
바뀌면 DataProvider를 구현한 HTTP 어댑터를 주입한다.

## 테스트

ai 폴더에서 기존 Python 환경으로 실행:

```powershell
python -B -m unittest discover -s tests -p test_document_sources.py -v
```

추가 테스트 라이브러리는 필요 없다. Pydantic은 기존 requirements.txt 의존성이다.
FakeProvider와 가짜 비동기 DB 연결을 사용한다. KoE5/GMS/DB 서버를 로드하지 않는다.
실제 PostgreSQL 쿼리 실행은 별도 통합 검증이 필요하다.

## TODO / 팀원 연결 지점 / 보류

- DocumentFieldSource 조회 Repository와 이 Service를 연결하는 Agent 호출부.
- HTTP 엔드포인트가 필요해지면 인증, 소유권/마이데이터 동의 확인을 포함한 경계 추가.
- 계좌 자동기입 요구사항 확정 후 별도 SourceKey와 Resolver 추가.
- 완료된 월/부분 데이터 정책을 제품 요구와 합의한 후 필요하면 해당 Resolver만 변경.
- 실제 DB 기반 통합 테스트. 현재 마이그레이션 SQL과 엔티티를 기준으로 작성했다.
- 필요할 때 요청 단위 조회 중복 제거 및 스냅샷 일관성 보강.
- RAG 담당자와 query_hint 기반 Agent Tool 계약을 정한 후 별도 Adapter 연결.
- 기존 팀원 파일 수정이 필요하지 않았으므로 승인 대기로 보류한 변경은 없다.
  main.py 라우터 등록, 공용 설정/모델 수정, RAG 수정은 이번 작업에 포함하지 않는다.

