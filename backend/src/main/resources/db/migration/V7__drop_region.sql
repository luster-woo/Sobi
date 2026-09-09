-- region 테이블 제거, seoul_commercial_data 에 자치구/행정동 코드·명 컬럼 직접 보유

ALTER TABLE seoul_commercial_data DROP COLUMN region_id;
DROP TABLE region;

ALTER TABLE seoul_commercial_data
    ADD COLUMN district_code VARCHAR(20) NOT NULL,
    ADD COLUMN district_name VARCHAR(20) NOT NULL,
    ADD COLUMN dong_code     VARCHAR(20) NOT NULL,
    ADD COLUMN dong_name     VARCHAR(20) NOT NULL;

COMMENT ON COLUMN seoul_commercial_data.district_code IS '자치구 코드';
COMMENT ON COLUMN seoul_commercial_data.district_name IS '자치구 코드명';
COMMENT ON COLUMN seoul_commercial_data.dong_code      IS '행정동 코드';
COMMENT ON COLUMN seoul_commercial_data.dong_name      IS '행정동 코드명';

ALTER TABLE seoul_commercial_data
    ALTER COLUMN month_revenue   DROP NOT NULL,
ALTER COLUMN week_revenue    DROP NOT NULL,
    ALTER COLUMN weekend_revenue DROP NOT NULL,
    ALTER COLUMN male_revenue    DROP NOT NULL,
    ALTER COLUMN female_revenue  DROP NOT NULL;