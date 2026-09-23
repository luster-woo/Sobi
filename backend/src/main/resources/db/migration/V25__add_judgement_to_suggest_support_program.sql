-- 마이데이터 연동 시 계산한 자격 판정 결과를 저장 (S15P21D101-303)
-- 설계 근거: ai/docs/04_judgement_design.md "저장"

ALTER TABLE suggest_support_program
    ADD COLUMN status      VARCHAR(10)      NOT NULL DEFAULT 'unknown',
    ADD COLUMN check_items JSONB,
    ADD COLUMN benefits    JSONB,
    ADD COLUMN distance    DOUBLE PRECISION,
    ADD COLUMN judged_by   VARCHAR(3)       NOT NULL DEFAULT 'llm';

ALTER TABLE suggest_support_program
    ALTER COLUMN reason TYPE VARCHAR(500);

ALTER TABLE suggest_support_program
    ADD CONSTRAINT chk_suggest_support_program_status
        CHECK (status IN ('eligible', 'unknown', 'ineligible')),
    ADD CONSTRAINT chk_suggest_support_program_judged_by
        CHECK (judged_by IN ('llm', 'sql'));

CREATE INDEX idx_suggest_support_program_business_status_distance
    ON suggest_support_program (business_id, status, distance);

COMMENT ON COLUMN suggest_support_program.status      IS '자격 판정 (eligible / unknown / ineligible)';
COMMENT ON COLUMN suggest_support_program.reason      IS '판정 사유 한 문장';
COMMENT ON COLUMN suggest_support_program.check_items IS '신청 전 본인이 확인해야 할 항목 (문자열 배열)';
COMMENT ON COLUMN suggest_support_program.benefits    IS '우대·가점 조건 (문자열 배열). 판정에는 쓰지 않음';
COMMENT ON COLUMN suggest_support_program.distance    IS '코사인 거리. 0에 가까울수록 유사. SQL 필터 탈락 건은 null';
COMMENT ON COLUMN suggest_support_program.judged_by   IS 'llm(조건 판정) / sql(정형 필터 탈락)';