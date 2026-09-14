-- application 테이블에서 잘못 생성된 business_id 제거
ALTER TABLE application
DROP COLUMN business_id;

-- 지원사업 FK 추가
ALTER TABLE application
    ADD COLUMN support_program_id BIGINT;

ALTER TABLE application
    ADD CONSTRAINT fk_application_support_program
        FOREIGN KEY (support_program_id)
            REFERENCES support_program(id)
            ON DELETE SET NULL;