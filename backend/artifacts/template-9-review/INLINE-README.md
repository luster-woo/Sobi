# template 9 신청인 이름 / 작성 월·일 추가

## 적용 순서

1. 이번 Agent 코드가 포함된 AI 이미지를 빌드·배포한다. 여기서는 빌드/배포하지 않았다.
2. ai 컨테이너의 `/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx` SHA256이 아래 값인지 확인한다.
   `dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84`
3. 기존 `backup-template-9.sql`로 현재 데이터를 백업한다.
4. **`add-template-9-inline.sql` 전체를 한 연결에서 실행한다.** 이전 `replace-template-9.sql`은 다시 실행하지 않는다. 이전 교체 SQL을 실행하면 이번 추가 필드가 삭제되고 수정한 사업계획 instruction도 되돌아간다.
5. 새 초안을 생성한다. 원본/이미 생성된 다운로드 파일은 바뀌지 않는다.

SQL은 template=9 / program_document=40 / normalized 경로 / HWPX / COMPLETED / 작성용을 검사한다. 기존 38개 필드와 사용자가 수정한 instruction은 보존하며 이름 5개 + 월 5개 + 일 5개만 추가한다. 정상 적용 후 총 53개 필드다. 같은 SQL 재실행 시 이 15개만 교체하므로 중복되지 않지만 이 15개의 DB ID는 새로 발급된다. 다른 필드가 같은 key/target을 사용하면 중단한다. PostgreSQL 실서버에서는 실행하지 않았다.

## 정책

- 원본 Parser 로직은 그대로다. 후보의 의미 분석은 수동 수행했으며 실제 GMS를 호출하지 않았다.
- Extractor는 `label : 공백 (고정 접미문)`의 단일 라벨과 괄호를 포함한 라벨을 지원한다. 공백 4칸 이상 등 기존 보수적인 조건은 유지한다.
- 날짜는 문단 전체가 `2026년     월     일` 형태인 경우만 월/일 공백을 분리한다. 이미 작성된 날짜, 탭, 제어/객체가 포함된 문단, 임의 문장 속 날짜는 이번 범위 밖이다.
- 신청인 이름: DIRECT/TEXT, USER/USER_NAME. `(서명, 인)`은 유지한다. 실제 서명/인장은 생성하지 않는다.
- 월/일: DIRECT/DATE, PROGRAM/PROGRAM_DRAFT_DATE. 새 SourceKey는 공고 시작일/마감일이 아니라 **초안 생성일**이다. DB 조회 없이 SourceResolveContext.draft_date를 사용한다. SourceType과 DB CHECK/migration은 변경하지 않았다.
- Runtime이 요청 시작 시 UTC+09:00(한국 시간) 날짜를 한 번 계산해 모든 필드에 전달한다. 요청 중 자정이 지나도 월/일이 서로 다른 날짜가 되지 않는다.
- Writer는 DATE 값과 date_part(month/day), fixed_year, 실제 원문 정규식·범위를 함께 검증한다. 고정 인쇄 연도와 생성 연도가 다르면 DATE_YEAR_MISMATCH로 실패하여 잘못된 날짜를 발행하지 않는다.
- 기존 current_text/native_ref/범위 검증은 유지한다. 날짜 Writer는 임의 숫자 위치나 다른 라벨에 날짜를 쓰지 않는다.
- 추가 필드 required=false다. 이름 Source가 없으면 해당 이름은 비어 있을 수 있다. 날짜 연도 불일치는 Writer 전체 실패로 처리한다.
- 새 후보 추가로 candidate_id는 달라질 수 있다. 기존 필드를 후보 ID로 매칭하지 않고 실제 위치를 비교했다.

## 검증

- 관련 후보 추출·Source·Analyzer·Persistence·Runtime·Writer 테스트 총 **322개 통과**. `git diff --check` 통과.
- 실제 원본에서 기존 TABLE_CELL 후보 39개가 ID를 제외하고 완전히 동일함을 확인했다.
- 추가 후보 15개 모두 기존 SemanticResponse와 SourceCatalog 검증 통과.
- 실제 원본 → Extractor → 수동 분석 → Runtime → Writer 실행. DB 조회값/사업계획 응답만 mock했고 날짜 Source는 실제 코드로 실행했다.
- 한국 시간 자정 경계에 해당하는 고정 시각으로 2026-09-21을 한 번 계산했고, 5개 날짜 줄 모두 `2026년 9월 21일`, 신청인 5곳 모두 테스트 이름이 들어감을 재파싱하여 확인했다.
- 기존 필드까지 포함해 작성 22개 / 건너뜀 31개. 원본 SHA256 유지.
- 최종 한글 프로그램 육안 레이아웃 검증과 운영 DB/실제 사용자/GMS 통합 검증은 별도다. GMS 사업계획 생성 기능 자체는 변경하지 않았다.
- `build_inline_additions.py <원본 경로>`로 SQL과 검증 결과 재생성 가능. 원본 해시가 다르면 중단한다.

## 변경 파일

AI 코드:
- `app/agent/documents/candidates/inline.py`: 단일·괄호 라벨 및 월/일 빈칸 후보 추출.
- `app/agent/documents/writer/inline.py`: DATE의 월/일 출력, 고정 연도/범위 검증.
- `app/agent/documents/runtime/service.py`: 한국 시간 요청 날짜 스냅샷.
- `app/agent/sources/enums.py`: PROGRAM_DRAFT_DATE 추가.
- `app/agent/sources/models.py`: 선택적 draft_date context 추가.
- `app/agent/sources/resolvers.py`: DB 조회 없는 날짜 resolver.
- `app/agent/sources/defaults.py`: 날짜 Source 등록.
- `app/agent/documents/schema_analyzer/catalog.py`: 날짜 Source 계약·설명 등록. GMS 호출 없음.
- `tests/test_draft_date_inline.py`: 신규 10개 테스트.
- `tests/test_inline_targets.py`: 새 날짜 후보 4개가 생긴 기존 fixture의 기대값 갱신.
- `tests/test_document_sources.py`: Context에 draft_date가 추가된 계약 반영.
- `app/agent/documents/candidates/README.md`, `app/agent/sources/README.md`: 지원 정책 추가.

산출물:
- `add-template-9-inline.sql`, `inline-additions.sql.in`: 적용 SQL과 생성 템플릿.
- `inline-analysis.json`, `inline-payload.json`, `inline-validation.json`: 수동 분석·저장 데이터·실제 문서 검증.
- `build_inline_additions.py`, `implement_inline_fields.py`, `test_draft_date_inline.py`: 재현/변경 기록. implement 스크립트는 이미 적용했으며 재실행하지 않는다.
- `INLINE-README.md`: 이 가이드.

Parser, Normalizer, 공용 설정/core, main.py, DB migration, RAG, 기존 공고 Parser는 수정하지 않았다. 삭제한 파일은 없다.
