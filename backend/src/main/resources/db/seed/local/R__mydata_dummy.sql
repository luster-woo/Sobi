BEGIN;

-- =========================================
-- 마이데이터 목 데이터
-- verify 더미의 brn 3건에 맞춰 매출·세액 24개월치와 보험 가입 내역을 넣는다.
--
-- 24개월인 이유: '직전연도 대비 매출 감소율' 같은 조건을 판정하려면
-- 전년 동기 비교가 필요하다.
--
-- mydata_tax / mydata_insurance 에는 유니크 제약이 없어
-- ON CONFLICT 를 쓸 수 없다. R__ 은 재실행되므로 지우고 다시 넣는다.
-- =========================================

INSERT INTO mydata (brn)
VALUES ('1234567890'),
       ('2345678901'),
       ('3456789012')
ON CONFLICT (brn) DO NOTHING;


-- =========================================
-- 1. 월 매출·세액 (최근 24개월, 당월 제외)
-- 업체마다 규모를 다르게 두어 판정 결과가 갈리는 것을 볼 수 있게 한다.
-- =========================================

DELETE FROM mydata_tax;

INSERT INTO mydata_tax (mydata_id, period, revenue, tax)
SELECT m.id,
       (date_trunc('month', CURRENT_DATE) - (g || ' months')::interval)::date,
       ROUND((b.base_revenue * (1 + 0.12 * SIN(g)))::numeric)::bigint,
       ROUND((b.base_revenue * (1 + 0.12 * SIN(g)) * 0.09)::numeric)::bigint
FROM generate_series(1, 24) AS g
         CROSS JOIN (VALUES ('1234567890', 22500000),  -- 맛있는 한상(한식). 연 2.7억
                            ('2345678901', 9800000),   -- 서울분식.          연 1.2억
                            ('3456789012', 15500000)   -- 카페 하루(커피).   연 1.9억
) AS b(brn, base_revenue)
         JOIN mydata m ON m.brn = b.brn;


-- =========================================
-- 2. 보험 가입 내역
-- 업체마다 가입 상태를 다르게 두어 체크리스트가 다르게 나오도록 한다.
-- =========================================

DELETE FROM mydata_insurance;

INSERT INTO mydata_insurance (mydata_id, insurance_id)
SELECT m.id, i.id
FROM (VALUES
          -- 맛있는 한상: 4대보험 + 화재배상 가입. 재난·가스 미가입
          ('1234567890', '국민연금'),
          ('1234567890', '건강보험'),
          ('1234567890', '고용보험'),
          ('1234567890', '산재보험'),
          ('1234567890', '다중이용업소 화재배상책임보험'),

          -- 서울분식: 사회보험 일부만. 의무보험 미가입
          ('2345678901', '국민연금'),
          ('2345678901', '건강보험'),

          -- 카페 하루: 4대보험 + 의무보험 대부분 가입
          ('3456789012', '국민연금'),
          ('3456789012', '건강보험'),
          ('3456789012', '고용보험'),
          ('3456789012', '산재보험'),
          ('3456789012', '다중이용업소 화재배상책임보험'),
          ('3456789012', '재난배상책임보험')
     ) AS v(brn, insurance_name)
         JOIN mydata m ON m.brn = v.brn
         JOIN insurance i ON i.name = v.insurance_name;

COMMIT;