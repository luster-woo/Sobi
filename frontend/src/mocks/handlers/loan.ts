import { http } from 'msw'

import type { ApplicationProduct } from '@/features/application/model/types'
import type { LoanDetail, LoanListData, LoanListItem } from '@/features/loan/model/types'
import { fail, ok } from '@/mocks/lib/envelope'
import type { ProductStatus } from '@/shared/constants/productStatus'

const BANKS = ['싸피은행', '기업은행', '대구은행', '소상공인시장진흥공단', '중소벤처기업진흥공단']
const STATUSES: ProductStatus[] = [
  'POSSIBLE',
  'IMPOSSIBLE',
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'WRITING',
]

const mockLoans: LoanListItem[] = [
  {
    loanId: 1,
    accountName: '소상공인 성장촉진대출',
    bankName: '싸피은행',
    interestRate: 3.4,
    maxLoanBalance: 100_000_000,
    status: 'SUBMITTED',
    isBookmark: true,
  },
  {
    loanId: 2,
    accountName: '소진공 일반경영안정자금',
    bankName: '소상공인시장진흥공단',
    interestRate: 3.0,
    maxLoanBalance: 70_000_000,
    status: 'POSSIBLE',
    isBookmark: false,
  },
  {
    loanId: 3,
    accountName: '지역신보 보증부 대출',
    bankName: '대구은행',
    interestRate: 4.1,
    maxLoanBalance: 50_000_000,
    status: 'APPROVED',
    isBookmark: true,
  },
  {
    loanId: 4,
    accountName: '스마트공방 기술향상자금',
    bankName: '중소벤처기업진흥공단',
    interestRate: 2.8,
    maxLoanBalance: 50_000_000,
    status: 'IMPOSSIBLE',
    isBookmark: false,
  },
  {
    loanId: 5,
    accountName: '청년고용연계자금',
    bankName: '중소벤처기업진흥공단',
    interestRate: 2.5,
    maxLoanBalance: 100_000_000,
    status: 'WRITING',
    isBookmark: false,
  },
  {
    loanId: 6,
    accountName: '기업은행 소상공인 우대대출',
    bankName: '기업은행',
    interestRate: 3.9,
    maxLoanBalance: 30_000_000,
    status: 'REVIEWING',
    isBookmark: true,
  },
  // 페이징을 확인할 만큼 채웁니다
  ...Array.from({ length: 17 }, (_, index) => ({
    loanId: 100 + index,
    accountName: `소상공인 정책자금 ${index + 1}호`,
    bankName: BANKS[index % BANKS.length],
    interestRate: Number((2 + (index % 20) / 10).toFixed(1)),
    maxLoanBalance: [30_000_000, 50_000_000, 70_000_000, 100_000_000][index % 4],
    status: STATUSES[index % STATUSES.length],
    isBookmark: index % 3 === 0,
  })),
]

/**
 * 목록 응답에는 최소 한도가 없어서 최대 한도에서 만든다.
 * 상세와 신청 화면이 같은 값을 보여야 해서 계산식을 한 군데 둔다.
 */
function minBalanceOf(maxLoanBalance: number): number {
  return Math.round((maxLoanBalance * 0.4) / 10_000_000) * 10_000_000
}

/**
 * 신청 화면 상단에 쓸 상품 요약. 신청 목(handlers/application.ts)이 가져간다.
 *
 * 두 목이 따로 데이터를 들면 목록에서 고른 상품과 신청 화면의 상품이 어긋난다.
 * 대출은 마감이 없어서 deadline 은 항상 null 이다.
 */
export function findLoanProductSummary(loanId: number): ApplicationProduct | null {
  const found = mockLoans.find((loan) => loan.loanId === loanId)
  if (!found) return null

  return {
    name: found.accountName,
    organization: found.bankName,
    interestRate: found.interestRate,
    minAmount: minBalanceOf(found.maxLoanBalance),
    maxAmount: found.maxLoanBalance,
    deadline: null,
  }
}

/**
 * 대출 (loan) 목 핸들러. 백엔드 미구현이라 이 목이 유일한 구현이다.
 *
 * ⚠️ sort 형식은 'interestRate,asc' (Spring) 으로 가정. 확정되면 이 파일만 고친다.
 */
export const loanHandlers = [
  // GET /api/v1/loan
  http.get('/api/v1/loan', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 20)
    const keyword = url.searchParams.get('keyword')
    const bankName = url.searchParams.get('bankName')
    const judgement = url.searchParams.get('judgement')
    const isBookmark = url.searchParams.get('isBookmark')
    const sort = url.searchParams.get('sort')

    let filtered = mockLoans
    // "검색: 상품명·기관" 이라 두 필드를 함께 본다
    if (keyword) {
      filtered = filtered.filter(
        (loan) => loan.accountName.includes(keyword) || loan.bankName.includes(keyword),
      )
    }
    if (bankName) filtered = filtered.filter((loan) => loan.bankName === bankName)
    if (judgement) filtered = filtered.filter((loan) => loan.status === judgement)
    if (isBookmark === 'true') filtered = filtered.filter((loan) => loan.isBookmark)

    if (sort) {
      const [field, direction] = sort.split(',')
      const sign = direction === 'desc' ? -1 : 1
      filtered = [...filtered].sort((a, b) => {
        if (field === 'maxLoanBalance') return (a.maxLoanBalance - b.maxLoanBalance) * sign
        return (a.interestRate - b.interestRate) * sign
      })
    }

    const totalElements = filtered.length
    const totalPages = Math.ceil(totalElements / size)

    return ok<LoanListData>(
      {
        loans: filtered.slice(page * size, page * size + size),
        page: {
          number: page,
          size,
          totalElements,
          totalPages,
          first: page === 0,
          last: page >= totalPages - 1,
        },
      },
      '대출 목록 조회 성공',
      { path: '/api/v1/loan' },
    )
  }),

  // GET /api/v1/loan/:loanId
  http.get('/api/v1/loan/:loanId', ({ params }) => {
    const loanId = Number(params.loanId)
    const found = mockLoans.find((loan) => loan.loanId === loanId)

    if (!found) {
      // 대출 도메인은 백엔드 미구현이라 전용 에러 코드가 없다. 확정되면 교체
      return fail(404, 'COMMON_001', '상품을 찾을 수 없습니다.', `/api/v1/loan/${loanId}`)
    }

    // 최소 한도·기간·업력·등급은 상세에만 있다. loanId 로 값을 흔들어 상품마다 다르게 보이게 했다
    return ok<LoanDetail>(
      {
        accountName: found.accountName,
        description: `업력 ${6 + (loanId % 3) * 6}개월 이상 소상공인 대상 · 대리대출(시중은행 취급)로 실행돼요.`,
        status: found.status,
        isBookmark: found.isBookmark,
        interestRate: found.interestRate,
        minLoanBalance: minBalanceOf(found.maxLoanBalance),
        maxLoanBalance: found.maxLoanBalance,
        period: 18 + (loanId % 4) * 6,
        firmAge: 6 + (loanId % 3) * 6,
        // loanId 로 흔들어 조건 있는 상품과 없는 상품을 섮는다
        requiresStart: loanId % 2 === 0,
        requiresEmployee: loanId % 3 === 0,
        rating: ['A', 'B', 'C'][loanId % 3],
      },
      '대출 상품 상세 조회 성공',
      { path: `/api/v1/loan/${loanId}` },
    )
  }),
]
