-- 읽는 코드가 저장소에 하나도 없는 테이블이다. 시드만 채우고 아무도 쓰지 않았다.
--
-- 같은 정보를 account.transfer_account 가 담는다. 금융망 대출 계좌 조회가
-- withdrawalAccountNo(출금 계좌번호)를 주므로 계좌 하나로 표현할 수 있다.
--   account.type = 'LOAN'  → transfer_account 에 출금 계좌번호
DROP TABLE IF EXISTS automatic_transfer;