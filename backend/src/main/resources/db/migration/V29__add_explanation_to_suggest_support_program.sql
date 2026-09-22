-- 판정 사유 설명을 캐시할 컬럼 (S15P21D101-484)
--
-- AI 의 POST /rag/explain 이 만드는 문장을 담는다. 건당 GMS 약 10크레딧에
-- 2~3초가 들기 때문에 매번 부를 수 없다.
--
-- **행 하나가 (사업자, 공고) 한 쌍이고, 설명도 그 단위로 한 번만 만들면 된다.**
-- 프로필이 바뀌지 않는 한 같은 문장이 나온다.
--
-- 무효화 로직은 따로 두지 않는다. 마이데이터를 다시 연동하면
-- MydataStore.saveJudgements 가 deleteAllByBusinessId 로 행을 통째로 지우고
-- 다시 넣으므로, 설명도 판정과 함께 사라진다.
--
-- reason(VARCHAR 500)과 달리 TEXT 다. 생성 문장은 길이를 예측할 수 없고,
-- 잘린 설명을 사용자에게 보여주느니 안 보여주는 편이 낫다.
--
-- 근거: ai/docs/08_explain.md

ALTER TABLE suggest_support_program
    ADD COLUMN IF NOT EXISTS explanation TEXT;

COMMENT ON COLUMN suggest_support_program.explanation
    IS '판정 사유 설명. AI /rag/explain 생성물. NULL 이면 아직 만들지 않았다는 뜻';
