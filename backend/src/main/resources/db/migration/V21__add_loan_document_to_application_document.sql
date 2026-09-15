-- 신청 CRUD 에 필요한 DB 변경 모음 (신청 생성·서류·제출)

-- =====================================================================
-- 1. application_document — 신청 생성 시 필수 서류마다 미제출 행을 미리 만든다
-- =====================================================================

-- 미제출 행에는 파일이 없다
ALTER TABLE application_document ALTER COLUMN original_filename DROP NOT NULL;
ALTER TABLE application_document ALTER COLUMN stored_path DROP NOT NULL;

-- 서류 행이 어떤 필수 서류인지 연결 (서류 이름·제출/작성 구분·원본 양식·AI 검증 기준)
ALTER TABLE application_document
    ADD COLUMN loan_document_id    BIGINT REFERENCES loan_document(id)    ON DELETE SET NULL,
    ADD COLUMN program_document_id BIGINT REFERENCES program_document(id) ON DELETE SET NULL;

-- 대출 서류 / 지원사업 서류 중 최대 하나 (필수 서류 삭제 시 SET NULL 로 둘 다 NULL 가능)
ALTER TABLE application_document
    ADD CONSTRAINT chk_application_document_target
        CHECK (loan_document_id IS NULL OR program_document_id IS NULL);

-- 작성 서류의 AI 초안 (제출 서류는 NULL). 사용자 업로드 파일(stored_path)과 분리
ALTER TABLE application_document
    ADD COLUMN draft_status VARCHAR(20),
    ADD COLUMN draft_path   VARCHAR(500);

COMMENT ON COLUMN application_document.document_type       IS 'SUBMIT(제출) / WRITE(작성)';
COMMENT ON COLUMN application_document.validation_status   IS 'NOT_SUBMITTED / PENDING / VALIDATING / PASSED / FAILED (작성 서류는 업로드 즉시 PASSED)';
COMMENT ON COLUMN application_document.loan_document_id    IS '대출 신청 시 해당 필수 서류';
COMMENT ON COLUMN application_document.program_document_id IS '지원사업 신청 시 해당 필수 서류';
COMMENT ON COLUMN application_document.draft_status        IS '작성 서류만: NOT_STARTED / WRITING / WRITTEN (작성 실패 시 NOT_STARTED)';
COMMENT ON COLUMN application_document.draft_path          IS '작성 서류만: AI 초안 파일 위치';

-- =====================================================================
-- 2. application — 제출 시 받는 금액·계좌
-- =====================================================================

-- 임시 저장을 하지 않으므로 PREPARING 동안은 NULL, submit 시 채운다
ALTER TABLE application
    ADD COLUMN amount     BIGINT,
    ADD COLUMN account_id BIGINT REFERENCES account(id) ON DELETE SET NULL;

COMMENT ON COLUMN application.status     IS 'PREPARING / SUBMITTED / REVIEWING / APPROVED / REJECTED / PAID';
COMMENT ON COLUMN application.amount     IS '신청 금액 (submit 시 저장, 비금전 지원사업은 NULL)';
COMMENT ON COLUMN application.account_id IS '출금(대출) / 지급(지원금) 계좌';

-- =====================================================================
-- 3. application — 한 사용자·한 상품에 반려되지 않은 신청은 최대 1건
--    [신청] 동시 요청으로 신청이 중복 생성되는 것을 막는다. 반려 이력은 여러 건 허용
-- =====================================================================

CREATE UNIQUE INDEX uq_application_user_loan_active
    ON application (user_id, loan_id)
    WHERE loan_id IS NOT NULL AND status <> 'REJECTED';

CREATE UNIQUE INDEX uq_application_user_program_active
    ON application (user_id, support_program_id)
    WHERE support_program_id IS NOT NULL AND status <> 'REJECTED';
