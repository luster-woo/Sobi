import type { RepaymentRecord } from '@/features/loan-repayment/model/types'
import { REPAYMENT_RECORD_STATUS } from '@/features/loan-repayment/model/types'

export function isSuccessRecord(record: RepaymentRecord): boolean {
  return record.status === REPAYMENT_RECORD_STATUS.SUCCESS
}

/**
 * 최신 회차부터 연속으로 성공한 횟수. 시안의 '최근 6회 정상 출금' 문구를 만든다.
 *
 * records 는 normalize 에서 최신순으로 정렬해 두었다. 앞에서부터 세다가 실패를 만나면
 * 멈춘다 — 중간에 한 번 밀린 사람에게 '최근 6회 정상' 이라고 하면 거짓말이 된다.
 */
export function countLeadingSuccess(records: RepaymentRecord[]): number {
  let count = 0
  for (const record of records) {
    if (!isSuccessRecord(record)) break
    count += 1
  }
  return count
}
