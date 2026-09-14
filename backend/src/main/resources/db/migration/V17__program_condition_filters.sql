-- 1) support_program: upsert 키·길이 확장
ALTER TABLE support_program
    ADD COLUMN pblanc_id VARCHAR(30) UNIQUE,
    ALTER COLUMN pblanc_nm           TYPE VARCHAR(300),
    ALTER COLUMN bsns_sumry_cn       TYPE TEXT,
    ALTER COLUMN reqst_mth_papers_cn TYPE TEXT;
COMMENT ON COLUMN support_program.pblanc_id IS '기업마당 공고ID (upsert 키)';

-- 2) program_condition: 정형 필터 + LLM 검증 조건 (support_program 1:1)
ALTER TABLE program_condition
    ADD CONSTRAINT uq_program_condition UNIQUE (support_program_id),
    ADD COLUMN nationwide      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN region_sido     VARCHAR(20),
    ADD COLUMN target_scale    VARCHAR(10),
    ADD COLUMN std_exclusion   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN max_revenue     BIGINT,
    ADD COLUMN min_biz_months  INT,
    ADD COLUMN max_biz_months  INT,
    ADD COLUMN llm_conditions  JSONB,
    ADD COLUMN source          VARCHAR(10),
    ADD COLUMN extracted_at    TIMESTAMP,
    ADD CONSTRAINT chk_program_condition_scale
        CHECK (target_scale IN ('소상공인','소공인','중소기업','무관')),
    ADD CONSTRAINT chk_program_condition_source
        CHECK (source IN ('llm','tag'));
COMMENT ON TABLE  program_condition IS '지원사업 조건. 정형 컬럼은 SQL 필터, llm_conditions는 LLM 검증용';
COMMENT ON COLUMN program_condition.nationwide     IS '전국 사업 여부';
COMMENT ON COLUMN program_condition.region_sido    IS '시도 조건 (표준 17개 표기). NULL=제한 없음';
COMMENT ON COLUMN program_condition.target_scale   IS '대상 규모 (소상공인/소공인/중소기업/무관)';
COMMENT ON COLUMN program_condition.std_exclusion  IS '표준 융자제외업종 적용 여부';
COMMENT ON COLUMN program_condition.max_revenue    IS '연매출 상한(원). NULL=제한 없음';
COMMENT ON COLUMN program_condition.min_biz_months IS '업력 하한(개월)';
COMMENT ON COLUMN program_condition.max_biz_months IS '업력 상한(개월)';
COMMENT ON COLUMN program_condition.llm_conditions IS 'SQL 필터 불가 조건 (시군구·대표자·자기신고·필수업종 등). LLM 검증 프롬프트에 전달';
COMMENT ON COLUMN program_condition.source         IS '추출 출처 llm / tag(hashTags 폴백)';
COMMENT ON COLUMN program_condition.extracted_at   IS '조건 추출 일시';
CREATE INDEX idx_program_condition_filter ON program_condition(region_sido, target_scale);

-- 3) minor_code: 표준 융자제외업종 플래그
ALTER TABLE minor_code
    ADD COLUMN is_std_excluded BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN minor_code.is_std_excluded IS '소상공인 정책자금 융자제외 표준 업종 해당 여부';
UPDATE minor_code SET is_std_excluded = TRUE
WHERE code IN ('CS200010','CS200011','CS200012','CS200013','CS200014','CS200015',
               'CS200006','CS200007','CS200008','CS200009',
               'CS200033','CS300005','CS200022');

-- 4) business_info.region 표준 표기 강제
ALTER TABLE business_info
    ADD CONSTRAINT chk_business_info_region
    CHECK (region IN ('서울','부산','대구','인천','광주','대전','울산','세종',
                      '경기','강원','충북','충남','전북','전남','경북','경남','제주'));