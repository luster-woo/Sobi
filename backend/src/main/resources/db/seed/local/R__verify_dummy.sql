INSERT INTO verify (
    brn,
    name,
    type,
    business_name,
    business_code_id,
    business_code_name,
    address,
    open_date,
    is_close,
    employee_count,
    region
)
VALUES
    (
        '1234567890',
        '박성현',
        '개인사업자',
        '맛있는 한상',
        NULL,
        '한식 음식점',
        '서울특별시 강남구 테헤란로 123',
        '2022-03-15',
        FALSE,
        5,
        '서울특별시 강남구'
    ),
    (
        '2345678901',
        '황문규',
        '개인사업자',
        '서울분식',
        NULL,
        '분식 음식점',
        '서울특별시 마포구 양화로 45',
        '2021-08-20',
        FALSE,
        5,
        '서울특별시 마포구'
    ),
    (
        '3456789012',
        '권병수',
        '개인사업자',
        '카페 하루',
        NULL,
        '카페',
        '서울특별시 성동구 성수이로 78',
        '2023-01-10',
        FALSE,
        5,
        '서울특별시 성동구'
    )
    ON CONFLICT (brn) DO NOTHING;