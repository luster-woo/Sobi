-- 테스트 페르소나 6명. Flyway 가 아니라 psql 로 직접 실행한다.
--   docker exec -i postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < personas.sql
--
-- user_key 는 싸피 금융망에서 발급받은 실제 값이다. 로컬과 EC2 가 같은 API KEY 를
-- 쓰므로 양쪽에서 그대로 동작한다. 계좌·대출·신용등급은 금융망에 이미 만들어 뒀다.
--
-- 전부 LOCAL 계정이다. provider=GOOGLE 로 두면 비밀번호 로그인이 막혀
-- 데모에서 화면을 볼 수 없다. 소셜 분기는 실제 구글 로그인으로 확인한다.

SET client_encoding TO 'UTF8';

BEGIN;

-- =========================================
-- 1. 회원
-- 비밀번호는 전부 BCrypt('sobi1234'). 회원가입 검증이 8자 이상이라 그에 맞췄다.
-- =========================================

INSERT INTO users (email, password, name, birth_date, role, credit_rating,
                   provider, provider_id, created_at, notification, user_key)
VALUES
    ('p1@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '김표준', '1994-03-11', 'ENTREPRENEUR',    NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     'e2b171e4-79f4-433e-a724-942eb95164b3'),

    ('p2@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '이영세', '1969-11-05', 'ENTREPRENEUR',    NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     '1c132d82-8902-4718-b7e4-85be78253cc9'),

    ('p3@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '박대형', '1981-07-22', 'ENTREPRENEUR',    NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     '2c87f8f1-a656-4dfc-840d-eab965664d09'),

    -- 예비창업자. business_info 가 없다
    ('p4@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '최예비', '1998-05-14', 'PREENTREPRENEUR', NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     '37706b7d-2b8a-4285-bdee-84cae77f4987'),

    -- 생년월일 미입력. AI 연령 조건이 unknown 으로 남는다
    ('p5@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '정소셜', NULL,         'ENTREPRENEUR',    NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     '9fdf0f90-3bae-4404-82a3-77185fcf2be3'),

    -- P1 과 직원 수만 다르다. 소상공인 필터 탈락 확인용
    ('p6@sobi.test', '$2b$10$jabfcvrGSn9k/m7XyqwCp.hsGWexUrgcUNVwDcFu5YjgJ6bLGnxca',
     '한직원', '1994-03-11', 'ENTREPRENEUR',    NULL, 'LOCAL', NULL, CURRENT_TIMESTAMP, TRUE,
     'a6d3e9b0-42a0-4e3d-921f-3c5130283b2f')

ON CONFLICT (email) DO UPDATE
    SET password = EXCLUDED.password, name = EXCLUDED.name,
        birth_date = EXCLUDED.birth_date, role = EXCLUDED.role,
        user_key = EXCLUDED.user_key;


-- =========================================
-- 2. 국세청 진위확인 목 (verify)
-- 업종은 코드로 조회한다. minor_code.id 는 적재 순서에 따라 달라진다.
-- =========================================

INSERT INTO verify (brn, name, type, business_name, business_code_id, business_code_name,
                    address, open_date, is_close, employee_count, region)
VALUES
    ('1010101010', '김표준', '개인사업자', '맛있는 한상',
     (SELECT id FROM minor_code WHERE code = 'CS100001'), '한식음식점',
     '서울특별시 강남구 테헤란로 123', '2022-09-01', FALSE, 4, '서울'),

    ('2020202020', '이영세', '개인사업자', '카페 하루',
     (SELECT id FROM minor_code WHERE code = 'CS100010'), '커피-음료',
     '경상북도 안동시 경동로 456', '2023-09-01', FALSE, 1, '경북'),

    ('3030303030', '박대형', '개인사업자', '대형분식',
     (SELECT id FROM minor_code WHERE code = 'CS100008'), '분식전문점',
     '광주광역시 서구 상무중앙로 78', '2021-09-01', FALSE, 2, '전남광주'),

    ('5050505050', '정소셜', '개인사업자', '게임존 PC방',
     (SELECT id FROM minor_code WHERE code = 'CS200019'), 'PC방',
     '경기도 수원시 팔달구 인계로 90', '2025-09-01', FALSE, 0, '경기'),

    -- 직원 5명. AI 정형 필터의 '소상공인 5인 미만' 에서 탈락한다
    ('6060606060', '한직원', '개인사업자', '한상차림',
     (SELECT id FROM minor_code WHERE code = 'CS100001'), '한식음식점',
     '서울특별시 강남구 테헤란로 456', '2022-09-01', FALSE, 5, '서울')

ON CONFLICT (brn) DO UPDATE
    SET business_name = EXCLUDED.business_name, address = EXCLUDED.address,
        region = EXCLUDED.region, employee_count = EXCLUDED.employee_count,
        open_date = EXCLUDED.open_date;


-- =========================================
-- 3. 사업자 등록 (business_info)
-- verify 내용을 그대로 복사한다. BusinessServiceImpl.business() 가 하는 일과 같다.
-- =========================================

INSERT INTO business_info (user_id, business_code_id, brn, business_name,
                           address, region, employee_count, open_date)
SELECT u.id, v.business_code_id, v.brn, v.business_name,
       v.address, v.region, v.employee_count, v.open_date
FROM (VALUES
          ('p1@sobi.test', '1010101010'),
          ('p2@sobi.test', '2020202020'),
          ('p3@sobi.test', '3030303030'),
          ('p5@sobi.test', '5050505050'),
          ('p6@sobi.test', '6060606060')
     ) AS m(email, brn)
         JOIN users u  ON u.email = m.email
         JOIN verify v ON v.brn = m.brn
ON CONFLICT (brn) DO UPDATE
    SET business_name  = EXCLUDED.business_name,
        address        = EXCLUDED.address,
        region         = EXCLUDED.region,
        employee_count = EXCLUDED.employee_count,
        open_date      = EXCLUDED.open_date;


-- =========================================
-- 4. 마이데이터 목 — 매출
-- 최근 24개월. 전년 동기 비교가 필요한 조건 때문에 12개월로는 모자란다.
-- =========================================

INSERT INTO mydata (brn)
VALUES ('1010101010'), ('2020202020'), ('3030303030'), ('5050505050'), ('6060606060')
ON CONFLICT (brn) DO NOTHING;

DELETE FROM mydata_tax
WHERE mydata_id IN (SELECT id FROM mydata
                    WHERE brn IN ('1010101010','2020202020','3030303030','5050505050','6060606060'));

INSERT INTO mydata_tax (mydata_id, period, revenue, tax)
SELECT m.id,
       (date_trunc('month', CURRENT_DATE) - (g || ' months')::interval)::date,
       ROUND((b.base_revenue * (1 + 0.12 * SIN(g)))::numeric)::bigint,
       ROUND((b.base_revenue * (1 + 0.12 * SIN(g)) * 0.09)::numeric)::bigint
FROM generate_series(1, 24) AS g
         CROSS JOIN (VALUES
                         ('1010101010', 22500000),   -- 연 2.7억
                         ('2020202020', 10000000),   -- 연 1.2억
                         ('3030303030', 100000000),  -- 연 12억  ← 매출 상한 초과 확인용
                         ('5050505050', 6670000),    -- 연 8천만
                         ('6060606060', 22500000)    -- 연 2.7억
) AS b(brn, base_revenue)
         JOIN mydata m ON m.brn = b.brn;


-- =========================================
-- 5. 마이데이터 목 — 보험 가입 내역
-- 업종별 대상 보험 안에서만 고른다. 목록 밖 보험을 넣으면 체크리스트에서 무시된다.
--   음식점군(한식·커피·분식)  사회보험 4 + 개인정보보호·화재배상·재난배상·가스사고 = 8
--   PC방                      사회보험 4 + 개인정보보호·화재배상 = 6
-- =========================================

DELETE FROM mydata_insurance
WHERE mydata_id IN (SELECT id FROM mydata
                    WHERE brn IN ('1010101010','2020202020','3030303030','5050505050','6060606060'));

INSERT INTO mydata_insurance (mydata_id, insurance_id)
SELECT m.id, i.id
FROM (VALUES
          -- 맛있는 한상: 8개 중 7개 (개인정보보호만 미가입)
          ('1010101010', '국민연금'), ('1010101010', '건강보험'),
          ('1010101010', '고용보험'), ('1010101010', '산재보험'),
          ('1010101010', '다중이용업소 화재배상책임보험'),
          ('1010101010', '재난배상책임보험'), ('1010101010', '가스사고배상책임보험'),

          -- 카페 하루: 8개 중 2개
          ('2020202020', '국민연금'), ('2020202020', '건강보험'),

          -- 대형분식: 8개 중 4개
          ('3030303030', '국민연금'), ('3030303030', '건강보험'),
          ('3030303030', '고용보험'), ('3030303030', '산재보험'),

          -- 게임존 PC방: 6개 중 3개
          ('5050505050', '국민연금'), ('5050505050', '건강보험'),
          ('5050505050', '다중이용업소 화재배상책임보험'),

          -- 한상차림: 8개 중 4개
          ('6060606060', '국민연금'), ('6060606060', '건강보험'),
          ('6060606060', '고용보험'), ('6060606060', '산재보험')
     ) AS v(brn, insurance_name)
         JOIN mydata m    ON m.brn = v.brn
         JOIN insurance i ON i.name = v.insurance_name;

COMMIT;