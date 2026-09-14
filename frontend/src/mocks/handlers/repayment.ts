import { http } from 'msw'

import type { RawLoanProduct, RawRepaymentDetail } from '@/features/loan-repayment/model/types'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 상환 관리 목.
 *
 * 서버가 주는 대로 문자열·YYYYMMDD·파스칼케이스를 그대로 흉내 낸다. 여기서 미리
 * 숫자로 바꿔주면 normalize 가 도는지 확인할 수 없다.
 *
 * 두 상품을 다르게 뒀다.
 *   0044…  전부 성공. 기본 경로
 *   0451…  3회차가 실패. 실패 사유 표시와 진행률 계산(성공만 카운트)을 확인한다
 */
const PRODUCTS: RawLoanProduct[] = [
  {
    accountNo: '0044815881614041',
    accountName: '지역신보 보증부 대출',
    bankName: '대구은행',
    status: '상환중',
    accountTypeUniqueNo: '004-4-67140989453846',
    loanPeriod: '36',
    loanDate: '20260810',
    maturityDate: '20260914',
    loanBalance: '30000000',
    interestRate: '4.1',
    withdrawalAccountNo: '0324003842129948',
    dailyDueAmount: 890000,
  },
  {
    accountNo: '0451863702889610',
    accountName: '소진공 일반경영안정자금',
    bankName: '기업은행',
    status: '상환중',
    accountTypeUniqueNo: '045-4-b3262da30da445',
    loanPeriod: '24',
    loanDate: '20260901',
    maturityDate: '20260924',
    loanBalance: '20000000',
    interestRate: '2.5',
    withdrawalAccountNo: '0324003842129948',
    dailyDueAmount: 840000,
  },
]

/** 하루 한 회차씩 날짜를 밀어가며 만든다 */
function makeRecords(
  startDate: string,
  count: number,
  amount: string,
  failedAt?: number,
): RawRepaymentDetail['repaymentRecords'] {
  const base = new Date(
    Number(startDate.slice(0, 4)),
    Number(startDate.slice(4, 6)) - 1,
    Number(startDate.slice(6, 8)),
  )

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(base)
    day.setDate(base.getDate() + index)
    const yyyymmdd = `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`

    const failed = failedAt === index + 1

    return {
      installmentNumber: String(index + 1),
      status: failed ? 'FAILED' : 'SUCCESS',
      paymentBalance: amount,
      repaymentAttemptDate: yyyymmdd,
      repaymentAttemptTime: '083000',
      // 실패하면 실제 출금이 없었으므로 빈 문자열로 온다고 가정했다
      repaymentActualDate: failed ? '' : yyyymmdd,
      repaymentActualTime: failed ? '' : '083012',
      failureReason: failed ? '출금 계좌 잔액 부족' : '',
    }
  })
}

const DETAILS: Record<string, RawRepaymentDetail> = {
  '0044815881614041': {
    accountNo: '0044815881614041',
    accountName: '지역신보 보증부 대출',
    status: '상환중',
    accountTypeUniqueNo: '004-4-67140989453846',
    loanBalance: '30000000',
    // 890,000 × 6 = 5,340,000 을 갚았다
    remainingLoanBalance: '24660000',
    withdrawalAccountNo: '0324003842129948',
    repaymentRecords: makeRecords('20260811', 6, '890000'),
    // 남은 원금 + 오늘까지 이자. 명세 예시는 잔액보다 작았는데 그건 임의값으로 보고
    // 여기서는 잔액보다 크게 뒀다 (백엔드 확인 대기)
    totalPayoffAmount: 24710000,
    interestSaved: 1450000,
  },
  '0451863702889610': {
    accountNo: '0451863702889610',
    accountName: '소진공 일반경영안정자금',
    status: '상환중',
    accountTypeUniqueNo: '045-4-b3262da30da445',
    loanBalance: '20000000',
    // 성공 2회분(1,680,000)만 빠졌다. 3회차는 실패
    remainingLoanBalance: '18320000',
    withdrawalAccountNo: '0324003842129948',
    repaymentRecords: makeRecords('20260902', 3, '840000', 3),
    totalPayoffAmount: 18360000,
    interestSaved: 620000,
  },
}

/**
 * 완납 처리된 계좌.
 *
 * 실제 금융망은 완납하면 계좌를 삭제한다. 목이 그걸 흉내 내지 않으면 완납해도 탭이
 * 그대로 남아서, "완납 후 탭이 사라지고 다른 탭으로 옮겨간다" 는 화면 동작을 확인할
 * 수 없다. 모듈 변수라 새로고침하면 초기화된다 — 확인용으로는 충분하다.
 */
const paidOff = new Set<string>()

export const repaymentHandlers = [
  http.post('/api/v1/repayment/finan/list', () =>
    ok<{ loanProductList: RawLoanProduct[] }>(
      { loanProductList: PRODUCTS.filter((p) => !paidOff.has(p.accountNo)) },
      '내 대출 상품 가입 목록 조회에 성공하였습니다.',
      { path: '/api/v1/repayment/finan/list' },
    ),
  ),

  http.post('/api/v1/repayment/finan/records', async ({ request }) => {
    const { accountNo } = (await request.json()) as { accountNo: string }
    const found = paidOff.has(accountNo) ? undefined : DETAILS[accountNo]

    // 금융망 조회 실패는 EXTERNAL_001 이다. 화면은 재시도 UI 를 띄운다
    if (!found) {
      return fail(
        500,
        'EXTERNAL_001',
        '금융망 API 호출에 실패했습니다.',
        '/api/v1/repayment/finan/records',
      )
    }

    return ok<RawRepaymentDetail>(found, '내 대출 상환 내역 조회에 성공하였습니다.', {
      path: '/api/v1/repayment/finan/records',
    })
  }),

  http.post('/api/v1/repayment/finan/loanBalanceInFull', async ({ request }) => {
    const { accountNo } = (await request.json()) as { accountNo: string }
    // 금융망이 계좌를 지우는 것을 흉내 낸다. 이후 list 에서 빠지고 records 는 400 이다
    paidOff.add(accountNo)

    return ok(null, '해당 대출 상품 일시납 상환에 성공했습니다.', {
      path: '/api/v1/repayment/finan/loanBalanceInFull',
    })
  }),
]
