# Template Preprocessing

단일 작성용 program_document를 기존 모듈로 전처리한다. semantic 판단/Writer/Runtime/배치가 아니다.

## 조사한 public interface

- DocumentNormalizerService.normalize(source_path, output_directory) → NormalizationResult (동기)
- HwpxParser.parse(path) → ParsedDocument (동기). DOCX Parser는 없다.
- FieldCandidateExtractor.extract(parsed) → list[FieldCandidate] (동기)
- GmsSchemaAnalyzer(client=GmsSchemaAnalyzerClient()).analyze(candidates) (비동기)
- DocumentSchemaPersistenceService.persist(template_id, analysis) (비동기)

동기 단계는 asyncio.to_thread로 실행한다. 후보/분석 결과는 복사/정렬/의미 수정 없이 전달한다.
constructor에서 repository/normalizer/parser/extractor/analyzer/persistence를 주입할 수 있다.
기본 구현은 위 public API를 그대로 쓴다. DB는 기존 app.core.db.acquire/conn.transaction을 사용한다.

## 입력과 기존 API 제약

```python
result = await TemplatePreprocessingService().preprocess(
    program_document_id=123,
    source_path="/data/test/original/card.hwp",
    output_directory="/data/test/normalized/card",
    original_format=DocumentFormat.HWP,
)
```

program_document에는 id/support_program_id/type/url만 있고 url→로컬 파일 계약이 없다.
다운로드/경로 추측 없이 호출자가 해당 문서의 실제 source_path/output_directory를 전달한다.
두 경로 및 문서 ID의 대응 관계는 호출자 책임이다.

Normalizer service.py는 normalize 내부에서만 확장자를 판별하며 public detector가 없다.
DB original_format은 NOT NULL이므로 변환 전 template 생성에는 초기 형식 정보가 필요하다.
안정화된 Normalizer를 수정하거나 확장자 판별을 복제하지 않기 위해 **original_format도 필수 입력**이다.
Normalizer가 판별한 original_format과 불일치하면 ORIGINAL_FORMAT_MISMATCH로 실패한다.
파일 존재/확장자/일반 파일 검증은 Normalizer가 수행한다.
향후 자동 판별이 필요하면 Normalizer에 public detector를 노출하는 API 변경을 별도로 검토해야 한다.
이번에는 해당 파일을 변경하지 않았다.

## Template / 상태 / transaction

- version 생성 규칙이 없어 schema_version=1을 고정 사용하며 자동 증가하지 않는다.
- start의 짧은 transaction에서 program_document 행을 잠그고 존재/작성용을 확인한다.
- (program_document_id, 1) template이 없으면 PENDING으로 생성 후 PARSING으로 전환한다.
  둘은 같은 transaction이며 외부에서는 commit된 PARSING부터 보인다.
- 기존 PENDING/FAILED/COMPLETED는 같은 ID로 재실행한다. parse_error는 시작 시 NULL로 초기화한다.
- PARSING이면 PREPROCESSING_IN_PROGRESS로 거부한다. 패배한 요청은 상태를 FAILED로 바꾸지 않는다.
  부모 행 잠금으로 동시에 최초 생성하는 요청도 직렬화하며 기존 unique index를 유지한다.
- normalized_format/path는 Normalizer 성공 후 짧은 transaction으로 기록한다.
- HWPX만 parser에 전달한다. DOC/DOCX는 정규화 후 PARSER_FORMAT_UNSUPPORTED로 FAILED 처리한다.
- Persistence 성공 후에만 COMPLETED로 갱신한다. field/source 저장은 기존 Persistence transaction만 사용한다.
- 변환/GMS 중 DB 연결이나 transaction을 유지하지 않는다. 기존 Persistence의 방어 검증도 유지한다.
- 시작 전 ID/형식 metadata/문서 검증 실패에는 실행 template을 변경하지 않는다.

## 실패 / 이전 snapshot

실행 단계 실패 또는 취소는 FAILED 기록을 시도하고 원래 예외를 다시 전달한다.
parse_error에는 고정된 단계명만 저장한다(예: `Preprocessing failed at schema_analysis.`).
임의 exception message/stack trace/문서 내용/API key/경로를 DB에 넣지 않는다.
logger에는 template ID와 실패 단계를 기록한다. SDK 예외 원문을 로그에 복사하지 않는다.
CLI는 원래 예외를 외부에 출력하지 않고 안전한 일반 오류만 출력한다.

Persistence 전 실패는 기존 field/source snapshot을 삭제하지 않는다.
Persistence 실패는 기존 transaction rollback으로 보존된다. FAILED와 이전 정상 snapshot이 공존할 수 있다.
**FAILED의 normalized_path는 새 시도 파일일 수 있고 기존 field 위치와 일치하지 않을 수 있다.**
현재 snapshot과 파일을 사용할 때 COMPLETED 상태를 요구해야 한다. 실패 파일/이전 normalized 파일은
자동 삭제하지 않는다. 오래된 파일 정리와 snapshot별 경로 이력은 후속 정책이다.

Persistence commit과 COMPLETED 갱신은 별도 transaction이다. 완료 갱신 실패 시 새 snapshot이
저장된 채 FAILED(또는 DB 장애로 PARSING)일 수 있다. 프로세스 강제 종료도 PARSING을 남길 수 있다.
자동 timeout 탈취/lease/distributed lock은 없다. 운영자가 기존 작업 종료를 확인한 뒤 상태를 복구해야 한다.
FAILED 기록 자체가 실패하면 이를 로그로 남기고 원래 예외를 보존한다.
asyncio.to_thread 작업은 취소 시 즉시 중단되지 않아 파일 변환이 백그라운드에서 끝날 수 있다.
직접 DB 상태 변경이나 이 서비스를 우회하는 쓰기는 중복 방어 범위 밖이다.

## 실제 문서 1개 E2E (사용자 실행)

1. 사용자 관리 V23까지 migration을 적용한다. 이 패키지는 migration을 만들거나 실행하지 않는다.
2. 기존 Docker 환경에 DB/GMS 환경 변수를 **실행 시** 전달하고 Java/hwp2hwpx를 준비한다.
3. 실제 작성용 program_document ID 및 그 문서의 원본 파일을 준비한다.
4. 컨테이너 /app에서 실행한다. 실제 GMS API 비용과 DB 변경이 발생한다.

```sh
python -B -m app.agent.documents.preprocessing \
  123 /data/test/original/card.hwp /data/test/normalized/card \
  --original-format HWP
```

123은 실제 ID로 바꾼다. 기존 app.core.db pool을 CLI가 열고 종료 시 닫는다.
별도 FastAPI endpoint는 필요하지 않다. 애플리케이션에서 호출할 때는 기존 열린 pool을 사용한다.
결과 JSON: template_id/program_document_id/status/normalized_format/normalized_path/field_count/source_count.

5. 반환된 template ID로 확인한다(아래 456 교체).

```sql
SELECT * FROM document_template WHERE id = 456;
SELECT id, field_key, field_type, mapping_status, field_order, location_info
FROM document_field_schema WHERE template_id = 456 ORDER BY field_order;
SELECT s.* FROM document_field_source s
JOIN document_field_schema f ON f.id = s.field_schema_id
WHERE f.template_id = 456 ORDER BY f.field_order, s.priority;
```

COMPLETED, 실제 normalized_path 파일, 작성 필드가 있는 샘플의 field_count > 0,
분석 결과와 일치하는 mapping_status, RESOLVED DIRECT source 연결,
target_location/current_text/input_shape/hints 보존을 확인한다.
모든 문서에 세 mapping_status가 전부 등장하거나 모든 DIRECT에 source가 있어야 하는 것은 아니다.
빈 후보/전부 IGNORE는 정상 0건 완료가 가능하다.

6. 같은 명령을 다시 실행한다. 같은 template ID/version을 사용하고 field/source가 누적되지 않아야 한다.
GMS 결과가 달라 개수가 달라질 수 있지만 이전 snapshot ID는 교체되고 현재 결과만 남는다.
이전 source는 FK cascade로 제거된다. 원본 문서는 변경되지 않는다.

## 테스트 / 범위

```sh
python -B -m unittest discover -s tests -p 'test_template_preprocessing.py'
python -B -m unittest discover -s tests
```

새 테스트는 단계별 mock과 짧은 transaction fake를 사용한다. 실제 GMS/DB/외부 프로그램은 실행하지 않는다.
실제 PostgreSQL 동시성 및 단일 문서 E2E는 사용자 환경에서 추가 검증해야 한다.
기존 Persistence PostgreSQL 선택 테스트는 SCHEMA_PERSISTENCE_TEST_DSN이 없으면 skip한다.
기존 Normalizer/Parser/Extractor/Analyzer/Persistence/Source/core/팀원 코드/migration 변경 없음.
