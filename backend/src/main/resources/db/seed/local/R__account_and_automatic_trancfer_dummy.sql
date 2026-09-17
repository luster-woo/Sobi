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

    -- 대출 계좌 2개. transfer_account 는 대출금이 나가고 들어오는 입출금 계좌다
    -- (금융망 대출 계좌 조회의 withdrawalAccountNo 와 같은 의미)
    (1, '국민은행', '44444444444444', 'LOAN', '11111111111111'),
    (1, '하나은행', '55555555555555', 'LOAN', '22222222222222')

ON CONFLICT (account_no) DO UPDATE
    SET transfer_account = EXCLUDED.transfer_account;