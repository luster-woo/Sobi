-- employee_count 를 5 에서 낮춘 이유:
--   AI 정형 필터가 target_scale='소상공인' AND employee_count < 5 이라
--   5명이면 소상공인 공고가 전부 탈락한다.
-- 세 번째를 경북으로 둔 이유:
--   셋 다 서울이면 지역 필터가 도는지 확인할 방법이 없다.

INSERT INTO verify (
    brn, name, type, business_name, business_code_id, business_code_name,
    address, open_date, is_close, employee_count, region
)
VALUES
    ('1234567890', '박성현', '개인사업자', '맛있는 한상', 10, '한식음식점',
     '서울특별시 강남구 테헤란로 123', '2022-03-15', FALSE, 4, '서울'),

    ('2345678901', '황문규', '개인사업자', '서울분식', 4, '분식전문점',
     '서울특별시 마포구 양화로 45', '2021-08-20', FALSE, 2, '서울'),

    ('3456789012', '권병수', '개인사업자', '카페 하루', 2, '커피-음료',
     '경상북도 안동시 경동로 456', '2023-01-10', FALSE, 1, '경북')

ON CONFLICT (brn) DO UPDATE
    SET business_name  = EXCLUDED.business_name,
        address        = EXCLUDED.address,
        region         = EXCLUDED.region,
        employee_count = EXCLUDED.employee_count,
        open_date      = EXCLUDED.open_date;