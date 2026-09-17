# Document Agent 진행사항

기록일: 2026-09-16. Document Agent 영역만 기록한다.
기존 진행사항 문서를 찾지 못하여 이 문서를 신설했다.

## 목적과 도메인

지원사업 신청서의 반복 작성을 돕는 Agent를 개발한다.
`program_document.type = '작성용'`인 문서만 대상이며, 제출용 및 대출 상품의
`loan_document`는 제외한다. 계좌 자동기입 요구사항은 보류되어 있다.

목표는 서식을 한 번 분석하여 template/schema/source를 저장하고 사용자별 작성에서
재사용하는 것이다. 이 전체 흐름과 저장/작성 orchestration은 아직 구현 완료 상태가 아니다.
program_document 존재 여부와 작성용 조건은 향후 application/service 진입점에서 검증한다.
Normalizer, Parser, CandidateExtractor는 파일/구조 계층이며 DB나 문서 업무 타입을 검사하지 않는다.

## 전체 구조와 구현 상태

```text
DocumentNormalizer                         구현
  -> Format Parser (현재 HWPX)              구현
  -> ParsedDocument                        구현
  -> FieldCandidateExtractor               이번 구현
  -> GMS Schema Analyzer                   예정
  -> 검수 -> DocumentFieldSchema / Source 저장  예정
  -> Document Agent orchestration          예정
  -> Source Resolver / RAG / generated 값
       Resolver 기반 구조 구현, RAG 실제 연결/생성 예정
  -> Document Writer                       예정
```

## Source 기반 구조

SourceRegistry, Resolver, DataProvider, SourceService로 책임을 분리했다.
주요 Source는 USER / BUSINESS / MYDATA / PROGRAM / RAG이다.
RAG는 현재 인터페이스/연결 기반만 있으며 실제 검색 연결은 후속 작업이다.
ACCOUNT는 SourceType Enum에만 남아 있고 Account SourceKey/Resolver는 없다.
LOAN SourceType, loan_id, LOAN SourceKey/Resolver/Provider/등록/테스트는 제거된 상태다.

BUSINESS와 MYDATA는 user_id를 필수 Context로 사용한다.

```text
BUSINESS: user_id -> business_info.user_id -> 해당 사용자의 유일한 사업자 정보
MYDATA:   user_id -> business_info -> brn -> mydata.brn -> mydata_tax / mydata_insurance
```

business_info가 없으면 BUSINESS_NOT_FOUND, 여러 건이면 DATA_INTEGRITY_ERROR로 처리하며
임의로 첫 번째 사업자를 선택하지 않는다. business_id를 호출 측에서 요구하지 않는다.
Source 단위 테스트 29개가 현재 전체 테스트 실행에 포함되어 통과했다.

## Document Normalizer

| 입력 | 결과 | 처리 |
|---|---|---|
| HWP | HWPX | hwp2hwpx CLI -> Java |
| HWPX | HWPX | 별도 출력 경로에 복사 |
| DOC | DOCX | LibreOffice headless subprocess |
| DOCX | DOCX | 별도 출력 경로에 복사 |

역변환은 지원하지 않는다. 원본 보존, 충돌 방지, timeout, subprocess 격리,
실제 결과 파일 확인, 안전한 외부 오류 및 의존성 부재 처리가 구현되어 있다.
Docker에는 Java Runtime, hwp2hwpx Python CLI 패키지, LibreOffice Writer,
Nanum 폰트가 필요하며 관련 Dockerfile/requirements 구성이 반영되어 있다.
CPU 전용 PyTorch 정책을 유지한다.

**사용자 전달 통합 검증 기록:** 실제 HWP 5개를 HWPX로 모두 변환했고 육안 검증에서
레이아웃 보존 상태가 매우 양호했다. 이번 Candidate 작업에서 변환이나 Docker build를 재실행한 것은 아니다.
Normalizer 단위 테스트 30개 통과. 실제 변환 프로그램을 mock한다.

## HWPX Parser / ParsedDocument

읽기 전용 ZIP/XML Parser로 section, paragraph, table, row, cell, 병합 셀,
중첩 표, 빈 셀 여부 및 위치 정보를 공통 Pydantic 모델로 표현한다.
section 숫자 순서 및 Paragraph/Table 구조 순서를 유지한다.
DocumentLocation에는 공통 index와 native_ref를 함께 제공한다.
section_file, element_path, element_name, row_order, cell_order 등의 native 정보는
향후 Writer가 원래 XML 요소를 재탐색하는 기반이다.

Parser 단위 테스트 35개 통과. Parser까지 구현한 당시 전체 테스트는 94개 통과였다.

**사용자 전달 실제 신청서 JSON 검증 기록:** 업체명, 대표자, 사업자등록번호, 주소,
업종, 매출액, 카드 매출액 등의 주요 표 구조와 병합/빈 셀이 정상 보존됨을 확인했다.
UNSUPPORTED_CONTROL 및 UNSUPPORTED_TABLE_CAPTION warning이 있으나,
사용자가 검증한 문서의 핵심 작성 셀 구조에는 현재 문제가 없는 상태다.
이번 작업에서 실제 지원사업 문서 5개에 대한 통합 검증을 다시 수행하지는 않았다.

## FieldCandidateExtractor — 2026-09-16 추가

`ParsedDocument -> list[FieldCandidate]`만 수행한다. label/target 위치를 복사하며
ParsedDocument, HWPX, DB를 변경하지 않는다. 의미 분류, LLM, SourceKey 매핑은 하지 않는다.

- RIGHT: label 오른쪽 경계에 target의 왼쪽 경계가 붙고 행 범위가 겹칠 때 탐지.
- BELOW: 해당 label에 RIGHT 후보가 없을 때, label 아래 경계에 target이 붙고 열 범위가 겹치면 탐지.
- 병합 셀은 row_index/column_index와 span으로 비교하며 리스트 순서를 좌표로 가정하지 않는다.
- 빈 target, 한정된 helper, 명시적 빈칸 placeholder만 허용하고 기존 작성 내용은 제외한다.
- helper: `(사업자등록증 상)`, `(해당자만 작성)`, `(해당 시 작성)`, `(YYYY년)`,
  `숫자/OO자 이내`, 짧은 `… 기준` 전체 문자열 패턴. current_text 원문 보존.
- label normalization은 공백/탭/줄바꿈 제거만 수행하며 label 원문은 유지한다.
- 단위만 있는 셀은 label/target에서 제외하고 인접 단위는 context/hints에 제공한다.
- context: target과 바로 인접한 셀의 짧은 텍스트, 항목당 80자/최대 6항목/총 300자 제한.
- confidence: RIGHT 빈 셀 .95/helper .80/placeholder .78;
  BELOW 빈 셀 .70(넓은 빈 셀 .75)/helper .65/placeholder .60. 규칙 상수로 관리한다.
- dedup: 동일 target당 최고 confidence, 동률이면 RIGHT > BELOW > SAME_CELL.
- ID: 최종 위치순 candidate_001부터 부여. 동일 입력에서 결정적이며 영구 DB ID는 아니다.
- input_shape: 명시적 날짜 placeholder DATE, 빈 체크박스 CHECKBOX,
  column_span >= 4 또는 row_span >= 2이면 LONG_TEXT, 그 외 빈칸 SHORT_TEXT,
  나머지 UNKNOWN. NUMBER 의미 추론은 하지 않는다.
- 중첩 표 내부는 재귀 탐색하되 중첩 표/비텍스트 객체를 담은 컨테이너 셀은 후보에서 제외한다.
- SAME_CELL은 Enum만 있고 미구현이다.

자세한 규칙/상수/제약과 실행 예시는
[Candidate README](../ai/app/agent/documents/candidates/README.md)를 참고한다.

### 이번 검증 결과

실제 실행 결과:

- Candidate 단위 테스트: **36개 통과**.
- 전체 Source 29 + Normalizer 30 + Parser 35 + Candidate 36: **130개 통과**.
- 최소 HWPX ZIP -> 기존 Parser -> Candidate CLI JSON smoke 통과:
  대표자명/빈 셀에서 RIGHT 후보 1개, 원본 bytes 불변 확인.
- Java/LibreOffice/hwp2hwpx 설치 또는 실제 변환 실행 없이 검증했다.

이번 변경은 Candidate 신규 모듈/README, 신규 단위 테스트, 이 진행사항 문서에 한정한다.
기존 Source, Normalizer, Parser, RAG, 공고 파싱, core, 공용 모델/설정,
main.py, dependency 파일, DB migration은 수정하지 않는다.

## DB 설계 상태와 다음 연결

Document Agent DB 개념은 document_template, document_field_schema,
document_field_source이다. document_template은 program_document만 참조하며
loan_document는 제외한다. `program_document.type = '작성용'`은 application/service에서 검증한다.
현재 FieldCandidate 자체는 DB에 저장하지 않는다.

```text
FieldCandidate -> GMS 분석 -> 검수 -> DocumentFieldSchema / DocumentFieldSource 저장
```

이 저장 Service와 GMS 연결은 후속 구현 대상이다.

## 다음 작업 (우선순위)

1. FieldCandidateExtractor 실제 지원사업 문서 통합 검증: 누락, 오탐, helper/context 확인.
2. GMS Schema Analyzer 설계/구현.
3. FieldCandidate -> DIRECT/COMPUTED/GENERATED/USER_INPUT 분류.
4. SourceKey 매핑.
5. DocumentFieldSchema / DocumentFieldSource 저장 Service.
6. RAG Source 연결.
7. Document Writer 설계.
8. HWPX Writer 구현.
9. DOCX Parser.
10. DOCX Writer.
11. 전체 Agent orchestration.

Candidate 현재 한계: 표 기반 규칙이므로 본문/SAME_CELL/객체 체크박스는 지원하지 않는다.
짧은 일반 텍스트를 label로 오인하거나 사전 밖 helper를 누락할 수 있다.
span은 실제 셀 너비의 근사치이며, 최종 의미 결정은 GMS 단계의 책임이다.


## 2026-09-16 — 실제 Candidate 통합 검증 기록 및 v2

### 사용자 전달 v1 실제 HWPX 5개 통합 결과

사용자가 실제 HWPX 5개에서 CandidateExtractor 통합 출력을 수행했다.
전달된 순서별 candidate 개수는 **21 / 21 / 6 / 12 / 25**이다.
현재 확인한 테스트에는 이 결과와 원본명/normalized filename의 확정 대응표가 없다.
파일명을 추측하지 않으며 위 개수는 전달 순서로 기록한다. 이 수치는 v2 결과가 아니다.

긍정 결과: 일반 RIGHT 입력 필드와 병합 셀 탐지 양호, helper 처리 정상,
큰 서술형 LONG_TEXT 영역 6개 탐지 양호, label normalization 정상,
unit 일부 context/hints 수집 정상, target native_ref 보존 정상.

개선 필요: 개업일, 상시근로자, 매출액, 카드 매출액, 운반비, 종업원수,
지원금신청액 등에서 unit/date/helper/복합 셀 관련 누락이 관찰되었다.
서식1/서식2/[별지 ...] form marker 및 긴 안내문의 false positive도 있었다.
이 필드명은 검증 사례로만 기록하며 production rule에는 넣지 않았다.

### 코드에서 확인한 원인과 v2 변경

| 유형 | 확인한 원인 및 처리 |
|---|---|
| LABEL / EMPTY / 원 | v1도 인접 빈칸+unit hints를 지원한다. 이 구조 자체는 누락 원인이 아님. 회귀 테스트 강화 |
| LABEL / EMPTY / 명 | 위와 동일. 병합 좌표 및 넓은 숫자칸 회귀 테스트 추가 |
| LABEL / 년 월 일 | 단순 패턴은 기존 지원. 고정 연도 2026년 월 일은 기존 정규식에서 제외되어 v2 확장 |
| helper + placeholder | 기존 전체 문자열 단일 패턴 매칭이 복합 셀을 거부. 모든 줄을 보수적으로 분류하여 허용 |
| 병합 LABEL/VALUE/UNIT | 기존 span 인접 처리는 지원. column_span 단독 LONG_TEXT 오판을 보완하고 unit 셀 제외 유지 |
| 보조 셀이 사이에 존재 | 기존 RIGHT는 직접 인접만 허용. 연속된 구분 기호만 최대 3셀(target 포함) 탐색 |

실제 파일별 정확한 누락 위치는 이 작업에서 재현 확인하지 않았으므로,
보고된 모든 누락이 해결됐다고 단정하지 않는다. v2 재출력으로 확인할 예정이다.

구현 사항:

- 기존 unit 사전 및 target/context/hints 처리 유지, 단위 인접 입력의 LONG_TEXT 오판 감소.
- DATE_PLACEHOLDER_PATTERNS: 빈 날짜 및 고정 연도/빈 월일을 허용, 채워진 날짜 제외.
- 빈 괄호/대괄호/밑줄, placeholder+helper 복합 셀 지원. 원문 및 helper/placeholder hints 보존.
- limited same-row scan: 최대 3셀, `: ： | │`만 통과, 첫 target 선택.
  unit/새 label/값/객체/분기/좌표 공백에서 중단, 다른 label의 직접 target 보호.
- scan 후보 confidence -0.10, hints.scan_cells 기록.
- LONG_TEXT는 row_span 또는 BELOW+넓은 span을 사용, 가로 span만 큰 RIGHT는 장문으로 판단하지 않음.
- 좁은 전체 일치 FORM_MARKER_PATTERNS로 서식/붙임 숫자 및 별지 서식 marker 제외.
- 명백한 instruction은 기존 길이 제한 내에서 유지하고 confidence -0.15,
  hints.likely_instruction=True 기록.
- SAME_CELL과 복합 연락처 sub-field는 미구현 유지. 가짜 위치/문단 fragment를 생성하지 않음.
- 기존 location/native_ref, 입력 불변성, RIGHT/BELOW, helper, 체크박스, dedup 구조 유지.

### v2 검증

기존 36개 테스트를 유지하면서 LONG_TEXT 물리 fixture 1개에 row_span을 명시했다.
신규 v2 테스트 25개를 추가했다.

- Candidate 단위 테스트: **61개 통과**.
- 전체 Source/Normalizer/Parser/Candidate 테스트: **155개 통과**.
- 실제 HWPX 5개를 테스트 fixture에 추가하지 않았다. 외부 프로그램 설치/변환도 실행하지 않았다.
- 수정 범위: candidates/rules.py, extractor.py, README.md,
  tests/test_field_candidate_extractor.py 및 이 누적 진행사항 문서.
- Parser, Normalizer, Source, 팀원 코드, dependency, migration은 변경하지 않았다.

### 다음 우선순위

1. 실제 HWPX 5개 Candidate v2 재검증.
2. false negative 및 target 위치 정확도 확인.
3. GMS Schema Analyzer 설계.
4. Candidate 의미 분류.
5. DIRECT / COMPUTED / GENERATED / USER_INPUT 분류.
6. SourceKey 매핑.
7. Schema DB 저장.

추가 TODO: SAME_CELL/복합 sub-field, 빈 레이아웃 셀과 실제 입력 셀 구분,
동일 줄에 붙은 helper+placeholder 등 미지원 변형. Parser/Writer 위치 설계가 필요하면 별도 논의한다.

재검증은 ai에서 문서마다 실행한다:

```bash
python -B -m app.agent.documents.candidates "normalized/실제파일.hwpx"
python -B -m app.agent.documents.candidates "normalized/실제파일.hwpx" --json
```


## 2026-09-16 — v2.1: Unit-only target 및 unit hint 연결 수정

### 사용자 전달 실제 원본 분석 결과

실제 HWPX 신청서에는 LABEL / EMPTY / UNIT뿐 아니라 LABEL / UNIT 구조가 반복된다.
현)상시근로자 / 명, 매출액 / 원, 카드 매출액 / 원, 운반비 / 원,
종업원수 / 명, 지원금신청액 / 원, 전년도 매출액 또는 월 매출액 / (원)이 확인되었다.
이 단위 셀은 숫자+단위를 작성하는 physical target이며 기존 unit target 일괄 제외 정책으로 누락됐다.
또한 v2 통합 출력에서 주소 Candidate에 unit=명이 붙는 등 주변 context의 단위가
관련 없는 후보에 연결되는 문제가 확인되었다. 이 분석은 사용자 전달 기록이며 이번에 원본을 재분석한 것은 아니다.

### 구현 내용

- unit-only target: 원/천원/만원/백만원/명/%/개월/건/회와 소괄호·공백 변형을 정확 일치로 허용.
- RIGHT target과 기존 제한 scan에 통합. 독립 년/월/일은 제외, BELOW unit target은 추가하지 않음.
- NUMBER, target_kind=unit_suffix, unit 정규화 값, insertion_mode=BEFORE_SUFFIX 제공.
- current_text, DocumentLocation, native_ref 및 입력 ParsedDocument는 변경하지 않음.
- RIGHT unit suffix confidence 0.85. 기존 empty/helper/placeholder confidence 유지.
- context 생성과 unit relation을 분리. target 자체 또는 좌표/span으로 바로 오른쪽에
  붙은 유일한 suffix 셀만 hints.unit의 근거로 사용. 위/아래/왼쪽/떨어진 unit은 연결하지 않음.
- LABEL / EMPTY / UNIT은 EMPTY만 target으로 유지. unit은 suffix metadata.
- 복수 suffix가 병합 경계에 닿으면 임의로 선택하지 않음.
- DATE/helper, form marker/instruction, checkbox, 기존 v2 LONG_TEXT 정책 유지.
- SAME_CELL/복합 연락처/fragment target은 미구현 유지. 가짜 location/Writer 구현 없음.
- 공용 모델/Enum 및 실제 필드명 전용 production rule을 추가하지 않음.

### RFP 표본 해석 보완

사용자 원본 확인 결과 연구개발 제안요청서는 본문이 이미 작성된 RFP 성격이며,
제목 주변의 빈 셀은 레이아웃 목적일 가능성이 높다. 과거 기록의 6개 후보를
실제 작성용 큰 빈칸 6개로 확정하지 않는다. 현재 핵심 작성용 template 품질 표본에서 제외하고
negative/reference sample로 유지한다. RFP 제목별 하드코딩이나 LONG_TEXT 재조정은 하지 않았다.

### 테스트 및 수정 범위

기존 Candidate 테스트 61개는 유지하며 unit target 금지 정책 테스트 2개의 기대값을
새 정책에 맞게 수정했다. 신규 synthetic 테스트 23개를 추가했다.

- Candidate: **84개 통과**.
- 전체: **178개 통과**.
- 주소/근로자 및 E-mail/카드 매출액에서 context에는 단위가 남아도 관계없는 unit hint가
  생성되지 않는 회귀 테스트 포함.
- parenthesized unit, 원문 보존, NUMBER, BEFORE_SUFFIX, 병합 인접, DATE,
  dedup, native_ref, 입력 불변성 및 기존 RIGHT/BELOW/helper 테스트 통과.
- 변경 파일: candidates/rules.py, extractor.py, README.md,
  tests/test_field_candidate_extractor.py, 이 누적 문서.
- Parser/Normalizer/Source/팀원 코드, dependency, migration은 수정하지 않음.
- 실제 3개 신청서의 v2.1 재출력 결과는 아직 확인하지 않았으며 테스트 fixture에 포함하지 않음.

### 다음 TODO

1. 실제 HWPX 재검증.
2. 카드수수료·물류비·출산급여 신청서의 unit-only Candidate 확인.
3. 잘못된 unit hint 제거 확인.
4. CandidateExtractor 안정화.
5. GMS Schema Analyzer.
6. FieldCandidate 의미 분류.
7. SourceKey 매핑.
8. DocumentFieldSchema / Source 저장.
9. SAME_CELL / 복합 sub-field는 별도 후속.
10. checkbox group은 필요 시 별도 후속.

실제 파일명을 확인하여 ai에서 실행한다(아래 파일명은 실행 예시):

```bash
python -B -m app.agent.documents.candidates "normalized/카드수수료.hwpx" --json
python -B -m app.agent.documents.candidates "normalized/물류비.hwpx" --json
python -B -m app.agent.documents.candidates "normalized/출산급여.hwpx" --json
```

한계: unit-only 표시가 실제 작성칸인지의 최종 판단은 후속 의미 분석이 필요하다.
현재 unit-only는 RIGHT/기존 scan 범위이며 복합 단위 문장·독립 날짜 단위·복합 sub-field는 확장하지 않는다.
괄호 suffix의 실제 삽입 동작은 향후 Writer 설계에서 검증한다.


## 2026-09-16 — GMS Schema Analyzer 구현

### 사용자 전달 Candidate v2.1 실제 작성용 HWPX 재검증

- 카드수수료: 13 -> 16 candidates.
- 물류비: 18 -> 22 candidates.
- 출산급여: 21 -> 22 candidates.

현)상시근로자, 매출액, 카드 매출액, 운반비, 종업원수, 지원금신청액,
전년도 매출액/월 매출액이 새로 정상 탐지되었다.
원/명/(원) suffix의 NUMBER + BEFORE_SUFFIX 검증이 완료되었다는 사용자 기록이다.
이번 작업에서 실제 파일을 다시 실행한 것은 아니다. CandidateExtractor는 안정화 상태로 보고
수정하지 않고 semantic 단계로 진행했다.

### 이번 구현

- 신규 app/agent/documents/schema_analyzer 모듈.
- 한 template의 compact Candidate 목록을 함께 전달. location/native_ref/XML은 전송하지 않음.
- GMS DIRECT/COMPUTED/GENERATED/USER_INPUT/IGNORE semantic proposal.
- 기존 SourceKey/SourceType/SourceRegistry 등록 정의를 재사용한 allowlist.
- AmountResolver/EmptyParams/PeriodParams 계약 adapter, 실제 resolve/DB/RAG 호출 없음.
- 후보 ID 정확 일치, enum/key/type/params/semantic 계약 검증.
- JSON only + Pydantic schema 검증, validation 실패 시 1회 repair(총 최대 2회).
- 공용 app.core.gms client 재사용, JSON object mode. strict JSON Schema GMS 지원은 미확인.
- 네트워크 오류 재시도/SDK 자동 재시도 차단, timeout, 민감 원문 없는 오류.
- 원래 Candidate 순서 복원, deterministic 중복 field_key suffix, 원문 label/위치 deep-copy join.
- mapping_status와 runtime_supported를 구분. GENERATED/RAG는 proposal이며 현재 실행 지원 아님.
- 대표자와 사용자 동일성은 확인되지 않아 Prompt에서 USER_NAME 제안 시 NEEDS_REVIEW 요구.
- 고정 연도와 최근 완료 N개월을 구분. 명시적 고정 기간의 rolling Source mapping 검증 실패 처리.
- 서명/동의/민감정보/계좌는 USER_INPUT, IGNORE는 Analyzer 전용이며 DB 저장 대상 아님.
- Candidate JSON 입력 CLI 및 fake client 단위 테스트 추가.

### 검증과 범위

실제 실행: **Analyzer 테스트 43개 통과 / 전체 테스트 221개 통과**.
테스트에는 대표적 DIRECT/USER_INPUT/IGNORE/GENERATED 응답, 실제 source catalog,
미등록 key, fixed-year 오류, candidate 무결성, repair, key 충돌, 위치 보존, context 제한,
API key 오류 비노출과 공용 client adapter 검증이 포함된다.
이 테스트는 fake 응답에 대한 코드 계약 검증이며 실제 GMS 의미 분류 정확도를 입증하지 않는다.
실제 GMS API 호출은 이번 작업에서 하지 않았다. manual 비용/호환성/품질 검증은 후속이다.

기존 CandidateExtractor/Parser/Normalizer/Source/공용 GMS/core/팀원 코드/dependency/DB migration은
수정하지 않았다. 공용 GMS 수정도 필요하지 않았다. 기존 진행사항은 삭제하지 않고 이 절을 누적했다.
새 모듈의 README에 책임/계약/한계와 manual 명령을 기록했다.

```bash
# ai에서 실행: 실제 GMS 호출 및 비용 발생
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/logistics.json" --json
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/birth.json" --json
```

### 다음 TODO

1. 실제 card.json GMS 분석.
2. 실제 logistics.json GMS 분석.
3. 실제 birth.json GMS 분석.
4. semantic 결과 검토(민감 필드, 대표자 동일성, 고정 연도, source 정확성).
5. SourceKey mapping 보정.
6. DocumentFieldSchema / DocumentFieldSource 저장 Service.
7. template preprocessing orchestration.
8. RAG Source 연결.
9. HWPX Writer.

알려진 한계: 의미 정책의 LLM 준수는 실제 검수가 필요하다. 날짜/기간 자연어 전반을 코드가
이해하지 않으며 context의 기간은 자동 검사하지 않는다. strict structured output 지원은
GMS 통합 검증 후 검토한다. DB/Writer/실제 값 생성/checkbox grouping/SAME_CELL은 이번 범위 밖이다.


## 2026-09-16 — GMS Schema Analyzer v1.1

### 실제 card.json 첫 통합 검증 실패 기록

사용자가 2026-09-16 실제 card.json GMS 통합 테스트를 수행했다.
첫 응답은 enum 오류로 repair가 실행됐고, repair 응답에서도 mapping_status에 USER_INPUT을
반환하여 SCHEMA_VALIDATION_FAILED가 발생했다. 전달받은 2차 응답은 16개 필드 중 15개의
mapping_status가 USER_INPUT이었으며 로컬 Pydantic 검증에서 동일한 15개 오류가 재현됐다.
첫 응답의 전체 내용은 제공되지 않았으므로 첫 응답의 세부 값은 사용자 보고를 기준으로 기록한다.

추가로 GMS가 target_kind=empty/helper를 USER_INPUT/IGNORE의 의미 판단 근거로
과도하게 사용해 업체명/사업자등록번호/업종/개업일 등 명확한 DIRECT 항목을 오분류했다.
기존 repair의 SCHEMA_CONTRACT:enum만으로는 오류 위치와 허용 값이 부족했다.

### v1.1 구현

- semantic_type와 mapping_status의 독립 Enum contract를 Prompt 앞/출력 설명 앞에 반복.
- USER_INPUT/IGNORE + RESOLVED + sources=[]가 정상임을 명시. 기존 모델이 허용해 모델 변경 불필요.
- RESOLVED: 의미/필요 매핑 확정, NEEDS_REVIEW: 모호함, UNSUPPORTED: 정확한 자동화 수단 부재.
- Source-first 순서와 물리 metadata/semantic 분리: empty != USER_INPUT, helper != IGNORE.
- unit suffix 명/원/(원)은 값이 아닌 작성 suffix임을 명시.
- 7개 few-shot 의미 예시 및 fixed-year != recent 12 months negative example.
- label 기반 Python 의미 자동 보정/새 SourceKey 추가 없음.
- repair.py 추가: candidate_id/path/code/received/allowed로 정규화한 repair.errors.
- 전체 후보를 다시 전달하고 전체 결과를 요청. 최초 + repair 1회 정책 유지.
- enum/source_key 오류는 잘못된 token과 허용값을 제공. 그 외 민감 문자열/알 수 없는 path는 마스킹.
- safe debug logging: attempt/error code/candidate_id/path만 출력. label/API key/전체 후보/응답/trace 없음.
- 외부 SCHEMA_VALIDATION_FAILED 오류 계약과 기존 GMS adapter는 유지.

### 회귀 테스트 및 결과

기존 Analyzer 43개 테스트는 변경하지 않고 신규 18개를 추가했다.
실제 GMS 실패 응답에서 label/note/instruction을 제거한 16개 필드 fixture를 추가했다.
동일한 Enum 오류 15개 -> 구체적인 repair -> 정상 응답 성공 및 두 번 실패를 검증했다.
empty/helper/unit suffix, 모든 의미 타입의 RESOLVED, DIRECT UNSUPPORTED,
허용 SourceKey, 고정 연도, 후보 무결성, 안전한 repair/logging 등도 확인했다.

- **Analyzer 총 61개 통과**.
- **전체 총 239개 통과**.
- 실제 GMS v1.1 호출은 수행하지 않았다. Prompt 개선의 실제 품질은 사용자 재검증 필요.
- Candidate/Parser/Normalizer/Source/Registry/catalog.py/core.gms/팀원 코드/DB는 변경하지 않았다.
- 변경 범위: Analyzer prompt.py/analyzer.py/README.md, 신규 repair.py,
  신규 전용 테스트·fixture, 이 누적 진행사항 문서.

재실행(ai 기준, 실제 GMS 비용 발생):

```bash
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json > "/data/test/schema-card-v11.json"
```

다음 확인: Enum 혼동 해소, 업체명/업종 등 DIRECT 매핑, 대표자 NEEDS_REVIEW,
고정 연도/카드매출 UNSUPPORTED, 동의/미동의 USER_INPUT+RESOLVED.
이후 logistics/birth 실제 분석과 검수 후 SourceKey mapping 보정 및 schema/source 저장 단계로 진행한다.


## 2026-09-16 — GMS Schema Analyzer v1.2 최소 보완

### 사용자 전달 두 번째 통합 테스트 결과

최초 GMS 응답의 candidate_002(대표자), candidate_008(성명)에서 semantic_type=NEEDS_REVIEW,
mapping_status=NEEDS_REVIEW가 반환됐다. Repair가 해당 경로/값/정확한 semantic Enum을 전달했으나
두 번째 응답도 같은 오류를 반복하여 SCHEMA_VALIDATION_FAILED가 발생했다.
이는 사용자가 전달한 실제 결과이며 이번 작업에서 실제 GMS를 재호출하지 않았다.

긍정 결과: 업체명/BUSINESS_NAME, 사업자등록번호/BUSINESS_BRN, 업종/BUSINESS_CATEGORY,
주소/BUSINESS_ADDRESS, 개업일/OPEN_DATE, 상시근로자/EMPLOYEE_COUNT, E-mail/USER_EMAIL은
DIRECT로 개선됐다. 2025년 매출과 카드매출은 DIRECT+UNSUPPORTED,
동의/미동의는 USER_INPUT+RESOLVED로 개선됐다는 사용자 기록이다.

원인 분석: Prompt의 'NEEDS_REVIEW로 남긴다', 'GENERATED의 source가 없으면 NEEDS_REVIEW' 등
속성명 생략이 필드 종류와 매핑 상태를 혼동시킬 여지가 있었다. 모델의 내부 원인은 확정할 수 없지만
실제 오류와 관련된 모호한 표현을 제거했다.

### 구현 변경

- semantic_type은 값 획득 방식, mapping_status는 확정 상태라는 두 질문을 명시.
- NEEDS_REVIEW/UNSUPPORTED/RESOLVED는 semantic_type으로 사용할 수 없다고 명시.
- 모든 모호한 상태 문장을 mapping_status=...로 수정.
- 대표자 DIRECT+NEEDS_REVIEW+sources=[] 및 GENERATED+NEEDS_REVIEW+sources=[] few-shot 추가.
- 유효 조합과 기존 sources 계약을 함께 명시. validation 모델/SourceKey는 그대로 유지.
- repair 첫머리에 semantic_type의 allowed 선택 의무 및 상태와 타입 혼용 금지 추가.
- detailed errors 구조와 최초+repair 1회 제한 유지. Python semantic 자동 보정 없음.

### GMS strict schema 조사

저장소의 공용 AsyncOpenAI client 및 호출 코드를 조사했다. json_object 사례만 있으며
GMS endpoint의 strict json_schema 지원 증거/선언은 확인되지 않았다.
로컬 검사 Python에는 openai SDK가 없어 SDK 내부 구현도 확인하지 못했다.
실제 API 호출/외부 검색/설치는 하지 않았다. interface의 옵션 전달과 endpoint 지원은 별개이므로
strict JSON Schema 사용 가능 여부는 **미확인**으로 기록한다.
현재 json_object 호출 및 로컬 Pydantic validation/repair를 유지한다.
app.core.gms 수정은 필요하지 않았고 모델 gpt-4.1-mini도 그대로다.

### 검증 및 변경 범위

신규 회귀 테스트 9개 추가, 기존 Analyzer 테스트 전부 유지.
**Analyzer 70개 / 전체 248개 통과**.
대표자/성명의 두 응답 동일 Enum 실패 및 2회 호출 후 SchemaAnalysisError,
정상 repair, valid 조합, few-shot, 모호한 문장 제거를 확인했다.

수정: Analyzer prompt.py/analyzer.py/README.md, 이 누적 문서.
추가: tests/test_schema_analyzer_v12.py.
Candidate/Parser/Normalizer/Source/Registry/RAG/core.gms/main/DB migration/팀원 코드/모델/adapter는 변경하지 않았다.

다음은 반영된 이미지·컨테이너에서 사용자가 실제 재검증한다:

```bash
python -B -m app.agent.documents.schema_analyzer "/data/test/candidates-v21/card.json" --json > "/data/test/schema-card-v12.json"
```

한계: JSON object mode는 API 수준 Enum 강제가 아니다. Prompt 보완만으로 실제 GMS 성공을
보장할 수 없으며, 위반은 기존 엄격한 validation으로 거부한다. 재검증 후 logistics/birth 분석과 검수를 진행한다.


## 2026-09-16 — Schema Analyzer v1.2.1 도메인 정책 확정

사용자 보고상 card.json v1.2 실제 GMS 결과는 전체적으로 정상이다.
이번 작업은 실제 GMS를 호출하지 않고 다음 확정 정책을 Prompt에 반영했다.

서비스 정책상 등록 사용자는 자신의 사업체를 등록하고 지원사업 신청서를 작성하는
사업자 소유자/대표자이다. 따라서 대표자/대표자명/대표자 성명 및 대표자 정보 영역의 성명은
USER / USER_NAME으로 직접 매핑한다: semantic_type=DIRECT, mapping_status=RESOLVED, value_type=TEXT.
이 결정은 과거 대표자 동일성 미확정/NEEDS_REVIEW 기록을 대체하는 최신 도메인 정책이다.

모든 성명 label을 일반화하지 않는다. label+context가 자녀/수임자 등 다른 사람을 가리키면
USER_NAME으로 연결하지 않으며 맥락 불확실성은 기존 NEEDS_REVIEW 정책으로 표현한다.
Python label 하드코딩이나 새 SourceKey는 추가하지 않았다.

USER_INPUT과 value_type은 별개다. 생년월일/출산일 등 날짜 의미 필드는 USER_INPUT이어도 DATE,
동의 여부는 BOOLEAN, 계좌번호/주민등록번호 등 식별자는 TEXT이다. 생년월일은
현재 catalog에 source가 없으므로 USER_INPUT/RESOLVED/sources=[]이며 DIRECT로 바꾸지 않는다.
Candidate input_shape가 최종 value_type을 강제하지 않도록 Prompt에 명시했다.

변경: prompt.py, 관련 테스트 2개 파일의 3개 테스트 기대값, README 및 이 누적 기록.
추가: test_schema_analyzer_v121.py의 신규 8개 테스트.
기존 Analyzer 테스트는 삭제하지 않았다.

실제 실행 결과: **Analyzer 78개 통과 / 전체 256개 통과**.
대표자/대표자 context 성명/다른 사람 성명/DATE USER_INPUT/Prompt 예시/식별자 타입을 검증했고,
fixed calendar year, allowlist, 후보 무결성, repair 1회, key suffix, runtime_supported,
location/native_ref 등 기존 테스트도 통과했다.

analyzer.py/client.py/catalog.py/models.py, Candidate/Parser/Normalizer/Source/Registry,
RAG/core/팀원 코드/DB migration은 변경하지 않았다. 실제 GMS API 호출은 하지 않았다.
다음 실제 통합 대상은 logistics.json 및 birth.json이며 card.json 재호출은 이번 작업에서 하지 않는다.


## 2026-09-16 — Schema Analyzer v1.2.2 semantic 최소 보완

사용자 전달 logistics/birth 실제 GMS 통합 검증 결과, 현재 SourceKey가 없는 객관적 사실이
USER_INPUT으로 과도하게 분류되는 경향이 확인됐다. 물류비의 법인등록번호/종목/주요생산품/
운반비(2025)/종업원수(2025), 출산급여의 전년도 매출액 또는 월 매출액 등이 해당한다.
정확한 SourceKey가 있는 사업장 주소도 USER_INPUT으로 분류됐다.
이는 사용자 전달 결과이며 이번 작업에서 실제 GMS 호출/재검증은 수행하지 않았다.

결정: semantic_type은 값의 본질적 획득 방식, mapping_status는 분류/매핑 확실성 및
현재 catalog/runtime 지원 여부로 명확히 분리한다. No SourceKey -> USER_INPUT을 금지한다.
객관적 사실은 DIRECT+UNSUPPORTED, 명확한 결정적 계산은 COMPUTED+UNSUPPORTED가 가능하다.
사용자 선택/직접 제공/민감정보/서비스 정책의 USER_INPUT과 혼동하지 않는다.

추가 Prompt 정책:

- 신청인 본인 성명 -> USER_NAME. 자녀/수임자/위임받는 자/다른 담당자 성명은 해당하지 않음.
- 사업장 주소 -> BUSINESS_ADDRESS. 거주/타인 주소와 구분하고 미지원 판단 전에 전체 catalog 재확인.
- 설립연월일과 OPEN_DATE 자동 동일시 금지. 동일성 불명확하면 DIRECT+NEEDS_REVIEW/sources=[].
- 고정 연도 종업원수 등 historical 값은 현재 Source로 대체하지 않음. DIRECT+UNSUPPORTED.
- 실제 발생 운반비는 객관적 사실. DIRECT+UNSUPPORTED+NUMBER.
- 지원금신청액의 계산식이 명확하면 runtime 미지원이어도 COMPUTED+UNSUPPORTED+NUMBER 가능.
- 전년도/월 매출액의 모호한 시점은 DIRECT+NEEDS_REVIEW, 기존 rolling 계산에 억지 매핑 금지.
- BUSINESS_CATEGORY는 단일 분류명(mc.name) 제공. 업태/종목 각각과 동일성은 임의로 확정하지 않음.
- 생년월일/출산일 DATE, 동의/계좌/자녀/수임자 USER_INPUT, 참고자료 IGNORE 등 기존 정책 유지.

수정: prompt.py, README, 이 누적 문서. 신규 test_schema_analyzer_v122.py 15개 추가.
기존 테스트 수정/삭제 없음. 실제 실행: **Analyzer 93개 / 전체 271개 통과**.

analyzer.py/models.py/client.py/catalog.py/repair.py, Source/Registry, Candidate/Parser/Normalizer,
RAG/core/main/팀원 코드/DB migration은 변경하지 않았다. SourceKey/계산 로직/label별 Python 규칙 추가 없음.
역사적 종업원수/설립일 등의 정책은 Prompt 중심이며 별도 코드 강제 검증은 이번에 추가하지 않았다.
실제 GMS는 호출하지 않았다. 후속 logistics/birth 출력에서 개선된 의미 분류를 검토해야 한다.

## 2026-09-16 — Schema Persistence 구현

사용자 전달 기준 card/logistics/birth 실제 GMS 통합 결과가 안정화되어 Analyzer Prompt 튜닝 종료.
이번 작업에서 실제 GMS 호출이나 Analyzer 수정은 하지 않았다.

V19/V22 및 app.core.db 조사 후 schema_persistence/{__init__,errors,models,service}.py와 README 추가.
실제 field_label/field_type 컬럼 사용. IGNORE 제외 후 list 순서대로 0-based field_order 저장.
source가 없어도 semantic_type을 유지해 field 저장. 모든 source는 신규 field ID에 연결.
location_info v1 envelope에 target_location/current_text/input_shape/hints를 보존.
기존 Writer JSON 계약은 없으며 native_ref 중첩 round-trip 테스트로 신규 계약 고정.
min_length/max_length/constraints는 입력이 없어 NULL 유지.
mapping_status/runtime_supported는 DB 대응 구조가 없어 저장하지 않음. constraints에 숨기지 않음.
Runtime 연결 전 승인된 migration으로 mapping_status 저장 계약이 필요하며 현 DB만으로
runtime_supported 정확한 복원 불가. 상세 구조적 누락/영향은 persistence README에 기록.

기존 acquire + 하나의 transaction으로 template/작성용 문서 확인 및 행 잠금 후 replace-all.
기존 source는 V19 FK cascade로 삭제. 중간 실패/commit 실패 시 전체 rollback.
빈 결과도 기존 snapshot을 비움. 다른 template 데이터는 유지.

신규 테스트 22개: fake DB 단위 21개 통과, 선택 PostgreSQL 1개는 DSN 미설정으로 skip.
Analyzer 93개 통과. 전체 293개 중 292개 통과 / PostgreSQL 1개 skip.
선택 PostgreSQL 테스트는 migrated public 정의를 TEMP 테이블로 복제하여 JSONB/cascade/rollback
검증하도록 준비. 실제 DB 검증은 이번 환경에서 수행하지 않음.
신규 테스트: test_schema_persistence.py, test_schema_persistence_postgres.py.
기존 파일 수정은 이 진행 문서만. Analyzer/Source/Normalizer/Parser/Candidate/core/main,
팀원 코드/migration/requirements/Dockerfile 변경 없음. CLI/API/Runtime/Writer 추가 없음.

## 2026-09-16 — V23 mapping_status DB 계약 반영

사용자가 직접 관리/적용하는 V23 계약:
document_field_schema.mapping_status VARCHAR(20) NOT NULL, default 없음.
RESOLVED / NEEDS_REVIEW / UNSUPPORTED를 Schema Snapshot에 영구 보존한다.
실제 V23 적용은 이번 작업에서 수행하거나 확인하지 않았으며 migration 파일도 변경하지 않았다.

Persistence INSERT에 analysis.mapping_status.value를 명시적으로 전달한다.
기존 location_info v1 구조 및 current_text/input_shape/hints를 변경하지 않는다.
mapping_status는 전용 컬럼에만 저장한다. runtime_supported는 DB/JSON에 저장하지 않는다.
Runtime Agent가 mapping_status/semantic_type/sources와 현재 Source Registry capability로
실행 시점에 판단하기로 결정했다. 이번에는 계산 함수를 추가하지 않았다.
Analyzer=semantic 판단, Persistence=validate/transform/persist, Runtime=현재 실행 가능 여부 판단.

IGNORE 제외, field_order/source 보존, replace-all, rollback, template/작성용 검증 유지.
기존 21개 단위 테스트 유지/보강 및 3개 추가: USER_INPUT+RESOLVED,
runtime_supported 미저장, 상태 변경 replace-all. rollback도 변경된 상태를 삽입하다
실패한 경우 이전 mapping_status 포함 snapshot 복원 검증.
선택 PostgreSQL 테스트에 세 상태 저장/조회와 상태 변경 rollback/replace 검증 추가.

결과: Persistence 단위 24개 통과 + PostgreSQL 1개 skip(전용 DSN 미설정).
Analyzer 93개 통과. 전체 296개 중 295개 통과 / 1개 skip.
수정: schema_persistence/service.py, README.md, 관련 테스트 2개, 이 진행 문서.
DB migration 및 Analyzer/Prompt/Normalizer/Parser/Candidate/Source/Registry/RAG/core/main/팀원 코드 변경 없음.

## 2026-09-16 — Template Preprocessing Orchestrator 구현 완료

구현 시작/완료: Normalizer → HwpxParser → FieldCandidateExtractor → Schema Analyzer → Schema Persistence.
신규 preprocessing 모듈에서 검증/단계 연결/template 상태/실패 처리만 담당한다.
기존 public API와 동기 단계의 asyncio.to_thread, 비동기 Analyzer/Persistence를 사용한다.

입력: program_document_id, source_path, output_directory, original_format.
program_document는 URL만 제공하며 로컬 경로 계약이 없어 경로는 호출자가 전달한다.
Normalizer의 형식 판별은 내부에만 있고 template original_format은 NOT NULL이다.
기존 API를 변경하거나 판별 로직을 복제하지 않기 위해 초기 형식을 명시 입력받고
Normalizer 결과와 일치하는지 검증한다. 향후 public detector 검토 필요.

schema_version=1 고정. 작성용 문서 확인 후 부모 행 잠금/상태 검사로 최초 생성 및 중복 시작 방어.
PENDING→PARSING→COMPLETED, 실패는 FAILED와 고정된 단계별 parse_error 기록 및 원래 예외 재전달.
FAILED/COMPLETED 재실행 가능, PARSING은 거부. 외부 작업 중 DB transaction 유지하지 않는다.
Persistence 이전 실패는 기존 snapshot 보존, Persistence 내부 실패는 기존 rollback 유지.
완료 상태 갱신 실패는 새 snapshot+FAILED일 수 있고 DB 장애/강제 종료는 PARSING을 남길 수 있다.
FAILED의 normalized_path와 이전 snapshot은 서로 대응하지 않을 수 있으므로 소비자는 COMPLETED 확인 필수.
자동 장애 복구/파일 정리/동시성 고도화는 후속 범위. DOCX Parser가 없어 DOC/DOCX 정규화 후 명확히 실패.

신규 preprocessing: __init__.py, service.py, repository.py, models.py, errors.py, __main__.py, README.md.
신규 tests/test_template_preprocessing.py 17개 통과.
전체 회귀 313개 중 312개 통과, 선택 PostgreSQL 1개 skip(전용 DB 미설정).
기존 Persistence 단위 24개, Analyzer 93개 포함 모두 통과.
CLI --help 확인. README에 실제 한 문서 E2E/동일 문서 재실행 명령과 DB 확인 SQL 기록.
실제 GMS/DB E2E 호출/설치는 수행하지 않았다.
기존 안정화 모듈/팀원 코드/migration 수정 없음. 기존 파일 변경은 이 진행 문서뿐이다.

## 2026-09-17 — 단일 E2E 검증 완료 / In-memory Batch Runner·API 구현

사용자 전달 기준 실제 HWP 단일 Template Preprocessing E2E 검증 완료:
HWP→HWPX, Parser, CandidateExtractor, 실제 GMS Analyzer, Schema Persistence,
mapping_status/location_info/Writer metadata 보존 및 동일 문서 replace-all 정상.
이번 구현 중에는 실제 GMS/DB E2E를 호출하지 않았다.

신규 preprocessing_batch에서 EC2 검수 원본을 DB program_document.id 기준으로 resolve하고
작성용 문서만 ORDER BY id 순차 처리한다. 기존 TemplatePreprocessingService는 변경 없이 재사용.
HWP/HWPX/DOC/DOCX를 원본 후보로 세어 정확히 1개만 허용하며 DOC/DOCX는 item 미지원 실패.
원본은 read-only, normalized/{id}/ 출력, 숨김/임시 후보 제외 및 symlink/경로 우회 방어.

Batch 상태/active lock은 InMemoryBatchStore만 담당. threading.Lock의 짧은 메모리 critical section과
active batch ID로 동시 시작을 거부하고 finally에서 release한다. 최근 50개 이력 보존.
processed=completed+failed+skipped. 개별 실패는 계속 진행하고 DB 조회 등 infrastructure 실패만 Batch FAILED.
COMPLETED 기본 skip, FAILED 기본 retry, PARSING 항상 skip. 옵션으로 완료 재처리/실패 미재시도 지원.

POST /api/v1/document-agent/preprocessing/batches → 202 + batchId/RUNNING,
GET 동일 경로/{batch_id} → 현재 상태/집계/items. FastAPI BackgroundTasks에서 동일 Runner 실행.
CLI python -B -m app.agent.documents.preprocessing_batch도 동일 Runner 사용.
FastAPI 공통 wrapper/admin 인증 dependency는 없어 Pydantic 응답/HTTPException을 사용.
API 기본 비활성화, DOCUMENT_AGENT_BATCH_API_ENABLED=true는 내부망 접근제어 후 활성화하는 스위치이며 인증이 아님.
root 환경변수 DOCUMENT_AGENT_ORIGINAL_ROOT/DOCUMENT_AGENT_NORMALIZED_ROOT 필수.
공용 config는 변경하지 않고 기존 dotenv 로딩 패턴 재사용.

단일 worker/단일 replica 전용. CLI는 별도 프로세스라 API와 동시 실행 금지.
재시작 시 Batch 메모리 상태 소실/BackgroundTask 중단 가능, PostgreSQL 결과는 유지.
PARSING 잔류는 자동 복구하지 않고 완료 template만 Runtime 소비 가능.
Redis/DB job table/새 migration/추가 dependency 없음.

신규 파일: preprocessing_batch/{__init__,__main__,config,errors,files,models,repository,router,service,store}.py,
README.md 및 tests/test_preprocessing_batch.py, test_preprocessing_batch_api.py.
기존 파일 변경: app/main.py 라우터 import/include_router 2줄과 이 진행 문서만.
기존 안정화 Agent/RAG/core/팀원 기능 코드/migration/requirements/배포 compose 변경 없음.

검증: 신규 Batch/API 36개 통과. 전체 349개 중 348개 통과 / PostgreSQL 선택 테스트 1개 skip.
기존 Orchestrator 17개, Persistence 단위 24개, Analyzer 93개 포함 모두 통과.
ASGI send 이벤트로 background 완료 이전 202 응답 전송 검증, CLI --help 확인.
실제 EC2/DB/GMS 통합은 사용자 후속 검증 필요. README에 mount/env/API/CLI/재실행/보안/단일 worker 제한 기록.

## 2026-09-17 — Document Agent Runtime v1 구현 완료

Template Preprocessing 및 Batch Runner 완료 이후 Runtime v1을 구현했다.
정형 routing은 코드가 수행하며 Schema Analyzer의 semantic/source 판단을 다시 LLM으로 요청하지 않는다.

신규 runtime/{__init__,__main__,service,repository,models,enums,errors}.py 및 README.md.
DocumentAgentRuntime.resolve(DocumentRuntimeRequest(template_id, user_id, user_inputs)) 제공.
exact template_id의 COMPLETED/작성용 문서만 소비하며 schema_version=1을 Runtime에 고정하지 않는다.
support_program_id는 program_document 관계에서 유도한다. business_id/application_id 추가 입력 없음.
기존 SourceService.resolve_source(SourceResolveContext, SourceResolveRequest) 그대로 연결.

Schema load: 기존 acquire와 짧은 REPEATABLE READ/READ ONLY transaction에서 3회 SELECT.
field_order ASC 및 source priority/id ASC, 일관된 snapshot, N+1 없음.
DIRECT+RESOLVED만 Source 호출. found=False인 경우만 다음 priority fallback.
예외/미지원은 값 부재로 삼키지 않으며 field별 ERROR/UNSUPPORTED로 격리.
USER_INPUT은 field_key별 supplied JSON 값 사용. 부재/null/공백은 INPUT_REQUIRED,
TEXT/NUMBER/DATE/BOOLEAN/JSON 기본 호환성만 확인하고 unknown key는 전체 validation error.
NEEDS_REVIEW/UNSUPPORTED는 routing 우선 차단. COMPUTED/GENERATED RESOLVED는 NOT_IMPLEMENTED.
RAG/PROGRAM_RAG는 호출하지 않음. 새 Calculator/Writer/Validation/HTTP API 없음.

ResolvedField는 원래 schema metadata, sources, location_info JSON, native_ref/element_path/hints를 보존.
Source date/Decimal 등 typed value를 의미 변경/formatting 없이 반환하며 source provenance는 type/key/priority만 기록.
ready_for_write는 required field 전부 RESOLVED 여부. optional 미해결은 허용하며 종합 문서 검증은 아님.
CLI 기본 출력은 상태/집계만, --show-values로 개발 검증 시에만 전체 값 출력.

테스트: 신규 test_document_runtime.py 39개 통과.
기존 Source 29 / Analyzer 93 / Persistence 단위 24 / Orchestrator 17 / Batch 36개 포함 회귀 통과.
전체 388개 중 387개 통과, PostgreSQL 선택 테스트 1개 skip(전용 DSN 미설정).
실제 GMS/RAG/Source DB 통합 또는 운영 EC2 파일 변경은 수행하지 않았다.
실제 SourceService+fake provider 연결 및 fake repository transaction/정렬/조회 계약 검증.

기존 안정화 모듈/Registry/RAG/core/main/requirements/DB migration 변경 없음.
기존 파일 변경은 이 누적 문서만. 새 DB table/결과 저장도 없음.
제한: exact template 선택, 접근 권한은 상위 서비스 책임, load 이후 동시 재분석은 Writer 전에 재확인 필요.
constraints/min_length/max_length는 보존만 하며 후속 Validation/Writer 단계에서 처리.
