ALTER TABLE insurance
    ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'MANDATORY';

ALTER TABLE insurance
    ALTER COLUMN category DROP DEFAULT;

ALTER TABLE insurance
    ADD CONSTRAINT chk_insurance_category
        CHECK (category IN ('SOCIAL', 'MANDATORY'));

COMMENT ON COLUMN insurance.category IS '사회보험(SOCIAL) / 업종별 의무보험(MANDATORY). SOCIAL 은 code_insurance 매핑 없이 모든 업체 체크리스트에 포함된다';
