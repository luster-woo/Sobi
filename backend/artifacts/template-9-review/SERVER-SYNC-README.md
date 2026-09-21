# 로컬 문서 40 → 서버 Document Agent 설정 동기화

## 범위

실행 중인 로컬 PostgreSQL `sobi-postgres-local`에서 읽기 전용 REPEATABLE READ 트랜잭션으로 직접 추출한 현재 데이터다. 생성 시점의 실제 DB 결과는 `local-document-40.json`에 보관했다.

- 로컬 template_id=9 / program_document_id=40
- 필드 53개 / Source 24개
- 사용자가 수정한 business_plan_detail instruction 포함
- 신청인 이름 5곳 + 월·일 10곳 포함
- program_document 원본 행은 서버와의 문서명/type 확인에만 사용하며 수정하지 않는다.

## 사용할 SQL

**`sync-server-document-40.sql`**을 사용한다. 이전 전체 교체 SQL/추가 SQL을 함께 실행할 필요가 없다.

서버의 program_document_id=40을 찾아:
- 템플릿이 1개면 서버 template_id를 유지하며 설정을 갱신한다.
- 템플릿이 없으면 새 템플릿을 생성한다. 결과의 server_template_id로 API를 호출한다.
- 템플릿이 2개 이상이면 대상을 임의로 고르지 않고 중단한다.
- 필드/Source는 로컬 설정으로 전부 교체한다. 해당 행 ID는 서버 DB에서 새로 발급한다.
- template의 original_format/normalized_format/normalized_path/parse_status/parse_error/schema_version 및 필드·Source 설정을 동기화한다.
- 서버의 기존 template.created_at은 보존하고 updated_at은 실행 시각을 기록한다. 로컬 ID/생성시각을 복사하는 방식은 아니다.
- 문서 40의 type/doc_name이 로컬과 다르면 잘못된 문서를 덮어쓰지 않도록 중단한다. support_program_id는 환경별 차이가 있을 수 있어 원본 관계를 그대로 유지한다. 적용 전에 서버에서 동일 공고의 문서인지 확인한다.

## 순서

1. PROGRAM_DRAFT_DATE 및 날짜 inline Writer를 포함한 최신 AI 코드를 먼저 서버에 배포한다.
2. 서버 AI 컨테이너 안에 아래 파일이 실제로 존재하고 해시가 일치하는지 확인한다.
   `/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx`

   ```sh
   sha256sum /data/document-agent/normalized/40/normalized-dy7clhwk.hwpx
   ```

   기대값: `dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84`

   SQL은 파일을 전송하거나 해시를 검사하지 못한다. 서버 경로가 다르면 실제 마운트에 맞춘 별도 조정이 필요하다.
3. 초안 생성/전처리가 동시에 실행되지 않는 시점에 서버 데이터를 백업한다. `backup-server-document-40.sql`의 결과 JSON 전체를 파일로 내보낸다. 긴 JSON이 잘리지 않게 한다.
4. `sync-server-document-40.sql` 전체를 한 DB 연결에서 실행한다. PostgreSQL/기존 document Agent migration이 적용된 환경이 필요하다. 오류 발생 시 `ROLLBACK;`하고 원인을 확인한다.
5. 마지막 조회 결과의 server_template_id, field_count=53, source_count=24를 확인한다. 서버 API에는 서버 template_id를 사용한다.
6. 새 초안을 생성해 이름·날짜·사업계획을 확인한다. 기존 다운로드 파일은 바뀌지 않는다.

psql 사용 예시(실제 서버 DB 접속정보/작업 디렉터리에 맞춰 실행):

```sh
psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 -f backup-server-document-40.sql -o server-document-40-before.json
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f sync-server-document-40.sql
```

백업 JSON은 보존용이며 자동 복원 SQL은 아니다. 실제 서버의 추가 제약/권한/다른 테이블의 필드 ID 참조는 로컬과 다를 수 있다. 실패하면 트랜잭션이 롤백되도록 구성했다.

## 검증

- 로컬 PostgreSQL과 같은 구조의 **세션 임시 테이블**에서 생성 SQL 실행 성공.
- 서버 template_id=900 시나리오에서 로컬 ID 9를 강제로 사용하지 않고 900 유지 확인.
- 동일 SQL 두 번 실행 후에도 필드 53개/Source 24개 유지.
- 전체 검증 트랜잭션 ROLLBACK. 실제 로컬 DB 행/서버 DB에는 적용하지 않았다.
- 서버 접속, 배포, 실제 파일 전송은 수행하지 않았다.

추가 산출물: export-local-document-40.sql, local-document-40.json, build_server_sync.py, sync-server-document-40.sql, validate-server-sync.sql, backup-server-document-40.sql, SERVER-SYNC-README.md. 이번 요청으로 애플리케이션 코드는 변경하지 않았다.
