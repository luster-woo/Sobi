import type {
  LoanProduct,
  RawLoanProduct,
  RawRepaymentDetail,
  RawRepaymentRecord,
  RepaymentDetail,
  RepaymentRecord,
} from '@/features/loan-repayment/model/types'

/**
 * 금융망 규격 → 화면 타입.
 *
 * 이 파일이 서버 응답의 이상한 점을 전부 흡수한다. 화면은 숫자와 'YYYY-MM-DD' 만 본다.
 *
 * '없음' 이 빈 문자열로 올지 null 로 올지 자리마다 다르다. 어느 쪽이 오든 같은 결과가
 * 나오도록 변환 함수가 전부 null 을 받는다. 호출부에서 자리마다 분기하면 한 군데를
 * 빠뜨리는 순간 화면 전체가 하얘진다 — 상환 내역은 회차가 수십 개라 한 행만 어긋나도
 * 목록 전체가 그려지지 않는다.
 */

type Maybe<T> = T | null | undefined

/** '100000000' → 100000000. 숫자가 아니면 0 — 금액 자리에 NaN 이 뜨는 것보다 낫다 */
function toNumber(value: Maybe<string | number>): number {
  if (value === null || value === undefined) return 0

  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** '20240415' → '2024-04-15'. 값이 없거나 형식이 다르면 null */
function toIsoDate(value: Maybe<string>): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

/** '080030' → '08:00:30' */
function toIsoTime(value: Maybe<string>): string | null {
  if (!value || !/^\d{6}$/.test(value)) return null
  return `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}`
}

/** 서버가 '없음' 을 빈 문자열로도 주고 null 로도 준다. 화면은 null 하나만 본다 */
function emptyToNull(value: Maybe<string>): string | null {
  if (!value) return null
  return value.trim() === '' ? null : value
}

export function normalizeLoanProduct(raw: RawLoanProduct): LoanProduct {
  return {
    accountNo: raw.accountNo,
    accountName: raw.accountName,
    bankName: raw.bankName,
    status: raw.status,
    loanPeriod: toNumber(raw.loanPeriod),
    // 날짜가 깨져 오면 빈 문자열로 둔다. 화면에서 '-' 로 보인다
    loanDate: toIsoDate(raw.loanDate) ?? '',
    maturityDate: toIsoDate(raw.maturityDate) ?? '',
    loanBalance: toNumber(raw.loanBalance),
    interestRate: toNumber(raw.interestRate),
    withdrawalAccountNo: raw.withdrawalAccountNo,
    dailyDueAmount: toNumber(raw.dailyDueAmount),
  }
}

export function normalizeRepaymentRecord(raw: RawRepaymentRecord): RepaymentRecord {
  return {
    installmentNumber: toNumber(raw.installmentNumber),
    status: raw.status,
    paymentBalance: toNumber(raw.paymentBalance),
    attemptDate: toIsoDate(raw.repaymentAttemptDate),
    attemptTime: toIsoTime(raw.repaymentAttemptTime),
    actualDate: toIsoDate(raw.repaymentActualDate),
    actualTime: toIsoTime(raw.repaymentActualTime),
    failureReason: emptyToNull(raw.failureReason),
  }
}

export function normalizeRepaymentDetail(raw: RawRepaymentDetail): RepaymentDetail {
  return {
    accountNo: raw.accountNo,
    accountName: raw.accountName,
    status: raw.status,
    loanBalance: toNumber(raw.loanBalance),
    remainingLoanBalance: toNumber(raw.remainingLoanBalance),
    withdrawalAccountNo: raw.withdrawalAccountNo,
    // 최신 회차가 위로. 서버 정렬을 믿지 않고 여기서 확정한다
    /* 한 회차도 상환되지 않았으면 배열 자리가 비어 온다 */
    records: (raw.repaymentRecords ?? [])
      .map(normalizeRepaymentRecord)
      .sort((a, b) => b.installmentNumber - a.installmentNumber),
    totalPayoffAmount: toNumber(raw.totalPayoffAmount),
    interestSaved: toNumber(raw.interestSaved),
  }
}
