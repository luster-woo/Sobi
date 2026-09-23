-- judged_by 에 'jev' 를 허용한다 (S15P21D101-480)
--
-- 자격 판정을 LLM 프롬프트에서 Jev(System One)로 교체하면서 AI 가 돌려주는
-- judged_by 값이 하나 늘었다. V25 의 CHECK 이 ('llm','sql') 뿐이라
-- /mydata/link 저장이 ConstraintViolationException 으로 터졌다.
--
-- 'llm' 은 남겨둔다. Jev 장애 시 GMS 폴백이 그 값으로 저장된다.
-- 근거: ai/docs/07_jev_judgement.md

ALTER TABLE suggest_support_program
    DROP CONSTRAINT IF EXISTS chk_suggest_support_program_judged_by;

ALTER TABLE suggest_support_program
    ADD CONSTRAINT chk_suggest_support_program_judged_by
        CHECK (judged_by IN ('jev', 'llm', 'sql'));

COMMENT ON COLUMN suggest_support_program.judged_by
    IS 'jev(자격 판정) / llm(Jev 장애 시 GMS 폴백) / sql(정형 필터 탈락)';
