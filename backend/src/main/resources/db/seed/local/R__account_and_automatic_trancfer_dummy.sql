BEGIN;

-- =========================================
-- 1. 사용자 계좌 더미 데이터
-- user_id = 1
-- =========================================

INSERT INTO account (
    user_id,
    bank_name,
    account_no,
    type,
    transfer_account
)
VALUES
    -- 입출금 계좌 3개
    (1, '국민은행', '11111111111111', 'COMMON', NULL),
    (1, '신한은행', '22222222222222', 'COMMON', NULL),
    (1, '우리은행', '33333333333333', 'COMMON', NULL),

    -- 대출 계좌 2개
    (1, '국민은행', '44444444444444', 'LOAN', NULL),
    (1, '하나은행', '55555555555555', 'LOAN', NULL)
    ON CONFLICT (account_no) DO NOTHING;;


-- =========================================
-- 2. 자동이체 더미 데이터
-- =========================================

-- 국민은행 입출금 계좌
-- → 국민은행 대출 계좌
INSERT INTO automatic_transfer (
    account_id,
    bank_name,
    account_no
)
SELECT
    id,
    '국민은행',
    '44444444444444'
FROM account
WHERE user_id = 1
  AND account_no = '11111111111111';


-- 신한은행 입출금 계좌
-- → 하나은행 대출 계좌
INSERT INTO automatic_transfer (
    account_id,
    bank_name,
    account_no
)
SELECT
    id,
    '하나은행',
    '55555555555555'
FROM account
WHERE user_id = 1
  AND account_no = '22222222222222';

COMMIT;