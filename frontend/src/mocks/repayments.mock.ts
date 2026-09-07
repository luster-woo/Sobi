import type { LoanContract } from '@/types'

export const mockContracts: LoanContract[] = [
  {
    id: 'ct-1',
    contractNo: 'LN-2026-0000482',
    name: '소진공 일반경영안정자금',
    agency: '소상공인시장진흥공단',
    principal: 30_000_000,
    balance: 30_000_000,
    monthlyPayment: 880_000,
    nextDueDate: '2026-10-15',
    firstDueDate: '2026-10-15',
    maturity: '2031-09-15',
    rate: 3.4,
    executedAt: '2026-09-02',
    account: { bank: '대구은행', masked: '****-3412', day: 15, retry: 3 },
    progress: { total: 60, done: 0, overdue: 0 },
    records: [],
  },
  {
    id: 'ct-2',
    contractNo: 'LN-2026-0000517',
    name: '지역신보 보증부 대출',
    agency: '대구신용보증재단',
    principal: 30_000_000,
    balance: 25_200_000,
    monthlyPayment: 890_000,
    nextDueDate: '2026-09-15',
    firstDueDate: '2026-03-15',
    maturity: '2029-02-15',
    rate: 4.1,
    executedAt: '2026-02-20',
    account: { bank: '대구은행', masked: '****-3412', day: 15, retry: 3 },
    progress: { total: 36, done: 6, overdue: 0 },
    records: [
      { date: '2026-08-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
      { date: '2026-07-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
      { date: '2026-06-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
      { date: '2026-05-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
      { date: '2026-04-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
      { date: '2026-03-15', product: '지역신보 보증부 대출', amount: 890_000, status: 'ok' },
    ],
  },
]

/** 16-1 연체 상태 예시 — 같은 계약의 연체 버전 */
export const mockOverdueContract: LoanContract = {
  ...mockContracts[1],
  balance: 26_000_000,
  nextDueDate: '2026-10-15',
  progress: { total: 36, done: 5, overdue: 1 },
  overdue: { date: '2026-09-15', amount: 890_000, days: 3, interest: 470, nextRetry: '2026-09-18' },
}
