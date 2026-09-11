import type { RepaymentRecord } from '@/features/loan-repayment/model/types'
import { REPAYMENT_RECORD_STATUS } from '@/features/loan-repayment/model/types'

export interface RepaymentProgress {
  /** 성공한 회차 수 */
  paidCount: number
  /** 총 회차 */
  totalCount: number
  /** 남은 회차 */
  remainingCount: number
  /** 0~100 */
  percent: number
}

/**
 * 상환 진행률.
 *
 * 성공한 회차만 센다. 출금이 실패한 회차는 돈이 안 빠졌으므로 진행이 아니다.
 * 전체 회차 수를 세면 연체 중인 사람에게 실제보다 많이 갚은 것처럼 보인다.
 *
 * ⚠️ 실패 상태값이 'FAILED' 라고 가정하지 않고, 성공값('SUCCESS')만 센다. 서버가 어떤
 *    실패 문자열을 쓰든 영향을 받지 않는다.
 */
export function getRepaymentProgress(
  records: RepaymentRecord[],
  loanPeriod: number,
): RepaymentProgress {
  const paidCount = records.filter(
    (record) => record.status === REPAYMENT_RECORD_STATUS.SUCCESS,
  ).length

  const totalCount = Math.max(loanPeriod, paidCount)
  const percent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0

  return {
    paidCount,
    totalCount,
    remainingCount: Math.max(totalCount - paidCount, 0),
    percent,
  }
}
