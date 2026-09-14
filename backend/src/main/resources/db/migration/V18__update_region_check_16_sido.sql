-- 전남·광주 통합(전남광주통합특별시) 반영: 시도 표준 표기 17 → 16
ALTER TABLE business_info DROP CONSTRAINT chk_business_info_region;
ALTER TABLE business_info
    ADD CONSTRAINT chk_business_info_region
    CHECK (region IN ('서울','부산','대구','인천','대전','울산','세종',
                      '경기','강원','충북','충남','전북','전남광주','경북','경남','제주'));