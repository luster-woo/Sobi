ALTER TABLE application DROP COLUMN business_id;

ALTER TABLE application
    ADD COLUMN support_program_id BIGINT REFERENCES support_program(id) ON DELETE SET NULL;


ALTER TABLE application
    ADD CONSTRAINT chk_application_target
        CHECK (loan_id IS NULL OR support_program_id IS NULL);

COMMENT ON TABLE  application IS '신청 (대출 / 지원사업 공용)';
COMMENT ON COLUMN application.loan_id            IS '대출 신청 시 loan.id';
COMMENT ON COLUMN application.support_program_id IS '지원사업 신청 시 support_program.id';
