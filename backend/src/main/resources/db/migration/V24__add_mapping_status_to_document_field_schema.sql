-- ============================================================
-- V23
-- Document Field Mapping Status 저장
-- ============================================================
--
-- 변경 사항
-- 1. document_field_schema에 mapping_status 추가
-- 2. Schema Analyzer의
--    RESOLVED / NEEDS_REVIEW / UNSUPPORTED 상태 보존
--
-- 주의:
-- runtime_supported는 DB에 저장하지 않는다.
-- 현재 Source Registry/runtime capability를 기반으로
-- 실행 시점에 판단한다.
--
-- 기존 document_field_schema 데이터에서는
-- mapping_status를 정확하게 복원할 수 없으므로
-- 기존 데이터가 존재하면 migration을 중단한다.
-- ============================================================


-- ============================================================
-- 1. 기존 데이터 안전성 검사
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM document_field_schema
        LIMIT 1
    ) THEN
        RAISE EXCEPTION
            'V23 migration aborted: 기존 document_field_schema 데이터가 존재합니다. 기존 schema snapshot을 정리한 뒤 다시 실행하세요.';
END IF;
END
$$;


-- ============================================================
-- 2. mapping_status 추가
-- ============================================================

ALTER TABLE document_field_schema
    ADD COLUMN mapping_status VARCHAR(20) NOT NULL;


-- ============================================================
-- 3. mapping_status CHECK
-- ============================================================

ALTER TABLE document_field_schema
    ADD CONSTRAINT chk_document_field_mapping_status
        CHECK (
            mapping_status IN (
                               'RESOLVED',
                               'NEEDS_REVIEW',
                               'UNSUPPORTED'
                )
            );


-- ============================================================
-- 4. Comment
-- ============================================================

COMMENT ON COLUMN document_field_schema.mapping_status
IS 'Schema Analyzer 매핑 상태: RESOLVED/NEEDS_REVIEW/UNSUPPORTED';