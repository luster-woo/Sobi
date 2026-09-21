# template_id=9 수동 Schema 분석 결과

## 대상과 실행 범위

- 사용자가 확인한 관계: template_id=9 → program_document_id=40.
- 운영 normalized_path: `/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx`.
- 첨부 원본 SHA256: `dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84`.
- 기존 `HwpxParser` → `FieldCandidateExtractor`를 그대로 실행했다. GMS의 의미 분석 부분만 수동 검토 결과로 대체했다.
- 기존 `SemanticResponse`, `GmsSchemaAnalyzer._validate/_join`, `DocumentSchemaPersistenceService.persist`를 사용했다. 저장 Service는 테스트용 FakeDB에만 연결했다.
- GMS 호출, 실제 DB 연결/수정, Docker 실행, 운영 코드 변경은 하지 않았다.

## 실행 파일

**교체 파일은 `replace-template-9.sql`이다. `replacement.sql.in`은 생성용 템플릿이며 직접 실행하지 않는다.**

1. 먼저 운영 파일의 해시가 위와 일치하는지 확인한다. 경로가 같아도 파일 내용이 다르면 location/current_text가 일치하지 않을 수 있다.

   ```sh
   # ai 컨테이너 내부에서 실행
   sha256sum /data/document-agent/normalized/40/normalized-dy7clhwk.hwpx
   ```

2. SQL을 실행할 환경으로 이 폴더의 SQL 파일을 옮긴다. 기존 인증 방식으로 PostgreSQL에 접속한다. 아래 `$DATABASE_URL`은 예시 연결 변수이며 프로젝트에 존재한다고 가정하지 않는다.

   ```sh
   psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -At -f backup-template-9.sql -o template-9-before.json
   psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f replace-template-9.sql
   ```

   백업 JSON에 template과 기존 fields/sources가 정상적으로 들어 있는지 확인한 후 교체한다. DB GUI에서는 SQL 전체를 한 연결에서 실행한다. 오류가 나면 같은 연결에서 `ROLLBACK;`한다. psql 예시처럼 실패 시 중단하도록 설정한다.

3. 실행 전후에 template 9를 사용하는 초안 작성/전처리 작업이 겹치지 않는 시간에 적용한다. 이미 실행 중인 Runtime은 이전 스키마를 읽었을 수 있다.

SQL은 대상 template/program_document 행을 잠그고 ID·normalized_path·HWPX·COMPLETED·작성용 여부를 확인한 뒤 교체한다. 필드 38개/Source 9개를 확인하고 한 트랜잭션으로 커밋한다. 값 또는 제약조건이 다르면 전체 변경이 롤백된다. 파일 해시는 SQL이 직접 검사하지 못하므로 1번 확인이 필요하다.

기존 저장 Service와 동일하게 필드를 삭제 후 재등록하므로 **field_schema.id와 source.id는 새로 발급된다.** template의 schema_version/path/status는 변경하지 않는다. 백업 JSON은 보존용이며 자동 복구 스크립트는 아니다. 적용 후에는 새 초안 요청으로 확인한다.

## 분류 결과

| 분류 | 개수 | 처리 |
|---|---:|---|
| DIRECT / RESOLVED | 6 | 업체명 2곳, 신청인 2곳, 사업자등록 주소, 이메일 |
| DIRECT / UNSUPPORTED | 2 | 견적 공급가, 부가세: 대응 Source 없음 |
| COMPUTED / UNSUPPORTED | 1 | 공급가 합계: 지원 계산기 없음 |
| GENERATED / RESOLVED | 1 | 사업 추진계획 본문 |
| USER_INPUT / RESOLVED | 28 | 휴대전화, 선택·동의·확인, 예정 시공 항목/외주업체/수량/규격 |
| IGNORE (저장 제외) | 1 | 사업 추진계획 제목 옆 작은 빈 셀 |

총 후보 39개 중 38개를 저장한다. `RESOLVED`는 매핑 상태이며 실제 값 조회나 완성된 신청서를 보장하지 않는다. 사용자 입력 항목에 대한 Runtime의 자동 작성은 수행하지 않는다. 원문에 개별 필수 여부가 명시되지 않은 후보는 required=false로 두었으며 제출 적합성을 판정한 것이 아니다.

`business_plan_detail`은 table_index=1, row_index=3, column_index=0의 9문단 셀이다. current_text의 개행 8개와 마지막 공백을 그대로 보존했다. 원문의 300자 제한을 instruction과 DB의 기존 max_length=300에 반영했다. max_length 설정은 기존 persistence가 자동 저장하는 항목에 추가한 수동 제약이다.

사업계획의 Source는 BUSINESS_NAME, BUSINESS_CATEGORY, BUSINESS_ADDRESS이다. 선택한 개선 항목/현장 상태/견적은 여기서 알 수 없으므로 지침에 추측 금지와 정보 부족 시 INPUT_REQUIRED 요청을 명시했다. 실제 Runtime에서 GENERATED 문장을 만드는 기능은 **여전히 기존 GMS**를 사용한다. 이번 결과는 Schema Analyzer의 GMS 분석만 대체한 것이다. USER_INPUT 값을 자동으로 GENERATED에 전달하는 새 기능은 만들지 않았다.

## 원문/위치 보존과 누락 범위

- candidate target_location, native_ref.element_path, current_text, input_shape, hints를 그대로 StoredLocationInfo에 저장했다. 공백과 개행은 trim하지 않았다.
- field_label은 기존 `_join` 규칙대로 candidate.label을 보존했다. 일부 체크박스 label은 인접한 보조금 안내문이므로 field_key와 reviewed-analysis의 note를 함께 확인해야 한다.
- Parser는 제어 노드 2개에 UNSUPPORTED_CONTROL 경고를 냈다. 위치는 section0.xml의 `[0,0,1]`, `[23,0,0,4,1,0,0,0,1]`이다. 이 경고를 없애거나 구조를 임의로 바꾸지 않았다.
- 현재 Extractor가 후보로 만들지 않은 환경개선 신청지, 일부 체크박스/확인란, 사진 첨부란, 반복 견적 표의 후속 행, 일부 합계칸, 날짜/서명란 등은 추가하지 않았다. 따라서 이 SQL은 **현재 후보 추출 범위의 교체 결과**이며 모든 작성칸을 포괄하지 않는다.
- IGNORE 처리한 제목 옆 빈 셀은 본문 9문단 셀과 구별한 수동 판단이다. 실제 한글 프로그램에서 렌더링한 육안 확인은 이번 검증에 포함되지 않았다.

## 검증 결과와 한계

- 모델, SourceCatalog 타입/키/파라미터, candidate ID 집합, key 유일성, 저장 Service 계약 검증 통과.
- 휴대전화는 사용자 확인에 따라 USER_INPUT/TEXT/RESOLVED, sources=[]로 변경했다. 실제 Runtime `_route`에서 Source 조회 없이 LEFT_BLANK가 되는 것을 추가 검증했다.
- 기존 저장 Service 테스트 **24개 통과**, Writer 테스트 **56개 통과**: 총 80개.
- 실제 첨부 HWPX + 합성 Runtime 값으로 기존 Writer 실행: **7개 작성 / 31개 건너뜀**.
- 작성 대상의 원문과 stored current_text 일치, 대상 문단 수 보존, 비대상 209개 셀의 Parsed 모델 동일성 확인.
- 원본 SHA256 불변 확인. 합성 결과 파일은 임시 디렉터리에서 검증 후 제거했다.
- PostgreSQL에서 SQL을 실행하거나 문법/제약조건을 실서버로 검증하지는 않았다. 저장 Service의 실제 저장 구조와 저장소 migration을 기준으로 구성했지만 운영 DB의 migration/권한/추가 제약 차이에 의한 오류까지 보장할 수 없다.
- 실제 사용자 데이터 조회, Runtime GMS 생성, 최종 레이아웃 육안 검증은 별도 실행이 필요하다.

## 추가한 파일

| 파일 | 역할 |
|---|---|
| parsed.json | 기존 Parser 원본 구조 출력 |
| candidates.json | 기존 Extractor의 39개 후보 |
| reviewed-analysis.json | 수동 의미 분석과 원본 후보를 결합한 결과 |
| replacement-payload.json | 저장할 38개 필드 및 9개 Source |
| replace-template-9.sql | 운영 DB에 적용할 교체 SQL |
| backup-template-9.sql | 교체 전 기존 데이터 조회/백업 쿼리 |
| validation.json | 실제 문서 Writer smoke 검증 결과 |
| build_review.py | GMS/실제 DB 없이 모델·저장·Writer 검증과 산출물 재생성 |
| replacement.sql.in | SQL 생성용 템플릿 |
| README.md | 분류 기준, 적용 방법, 검증 범위 |

위 파일만 새로 추가했다. 기존 코드 수정/삭제는 없다. 재생성은 프로젝트 의존성이 설치된 Python에서 `python -B artifacts/template-9-review/build_review.py <첨부 HWPX 경로>`로 실행한다. 첨부 SHA256이 다르면 즉시 중단한다.
