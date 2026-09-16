-- ============================================================
-- V22
-- Document Agent 대상을 지원사업 작성용 문서로 제한
--
-- 변경 사항
-- 1. document_template에서 loan_document 관계 제거
-- 2. program_document_id를 필수로 변경
-- 3. document_field_source에서 LOAN source_type 제거
--
-- 주의:
-- program_document.type = '작성용' 조건은
-- cross-table CHECK 대신 애플리케이션 계층에서 검증한다.
-- ============================================================


-- ============================================================
-- 1. 기존 데이터 안전성 검사
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM document_template
        WHERE program_document_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'V22 migration aborted: loan_document 기반 document_template 데이터가 존재합니다.';
END IF;
END
$$;


DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM document_field_source
        WHERE source_type = 'LOAN'
    ) THEN
        RAISE EXCEPTION
            'V22 migration aborted: LOAN source_type 데이터가 존재합니다.';
END IF;
END
$$;


-- 현재 존재하는 program_document template가
-- 작성용 문서인지 한 번 검증한다.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM document_template dt
        JOIN program_document pd
          ON pd.id = dt.program_document_id
        WHERE pd.type <> '작성용'
    ) THEN
        RAISE EXCEPTION
            'V22 migration aborted: 제출용 program_document를 참조하는 document_template이 존재합니다.';
END IF;
END
$$;


-- ============================================================
-- 2. document_template 정리
-- ============================================================

-- 기존 XOR CHECK 제거
ALTER TABLE document_template
DROP CONSTRAINT IF EXISTS chk_document_template_target;


-- 대출 문서용 unique index 제거
DROP INDEX IF EXISTS uq_document_template_loan_version;


-- loan_document 관계 제거
ALTER TABLE document_template
DROP COLUMN IF EXISTS loan_document_id;


-- 이제 모든 template은 반드시 program_document를 참조
ALTER TABLE document_template
    ALTER COLUMN program_document_id SET NOT NULL;


COMMENT ON TABLE document_template
    IS '지원사업 작성용 문서에 대한 Document Agent 템플릿';

COMMENT ON COLUMN document_template.program_document_id
    IS '작성 대상 program_document.id. 애플리케이션에서 type=작성용만 허용';


-- ============================================================
-- 3. document_field_source에서 LOAN 제거
-- ============================================================

ALTER TABLE document_field_source
DROP CONSTRAINT IF EXISTS chk_document_field_source_type;


ALTER TABLE document_field_source
    ADD CONSTRAINT chk_document_field_source_type
        CHECK (
            source_type IN (
                            'USER',
                            'BUSINESS',
                            'MYDATA',
                            'ACCOUNT',
                            'PROGRAM',
                            'RAG'
                )
            );


COMMENT ON COLUMN document_field_source.source_type
    IS 'USER/BUSINESS/MYDATA/ACCOUNT/PROGRAM/RAG';


-- ============================================================
-- 4. 조회 성능용 index 확인
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_document_template_program
    ON document_template(program_document_id);