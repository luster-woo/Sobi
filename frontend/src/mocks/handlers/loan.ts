import { http, HttpResponse } from 'msw'

import type { LoanDetail, LoanListData, LoanListItem } from '@/features/loan/model/types'
import type { ProductStatus } from '@/shared/constants/productStatus'
import type { ApiResponse } from '@/shared/types'

const BANKS = ['싸피은행', '기업은행', '대구은행', '소상공인시장진흥공단', '중소벤처기업진흥공단']
const STATUSES: ProductStatus[] = [
  'POSSIBLE',
  'IMPOSSIBLE',
  'SUBMITTED',
  'REVIEW',
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
    status: 'REVIEW',
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
 * 대출 (loan) 목 핸들러.
 *
 * 실제 응답 형태(봉투 + page 객체)를 그대로 흉내냅니다. 그래야 서버로 바꿀 때
 * 화면과 훅을 안 고칩니다.
 *
 * ⚠️ sort 값 형식이 명세에 없어 'interestRate,asc' 같은 Spring 형식으로 가정했습니다.
 *    확정되면 이 파일만 고치면 됩니다.
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

    const body: ApiResponse<LoanListData> = {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/v1/loan',
      message: '대출 목록 조회 성공',
      data: {
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
      error: null,
    }

    return HttpResponse.json(body)
  }),

  // GET /api/v1/loan/:loanId
  http.get('/api/v1/loan/:loanId', ({ params }) => {
    const loanId = Number(params.loanId)
    const found = mockLoans.find((loan) => loan.loanId === loanId)

    if (!found) {
      return HttpResponse.json({ message: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    /*
     * 목록에 없는 필드는 여기서 만든다. 목록 응답에는 최대 한도만 오고 최소 한도·상환
     * 기간·업력·대상·등급은 상세에만 있다. loanId 로 값을 흔들어 화면에서 상품마다
     * 다르게 보이게 했다.
     */
    const detail: ApiResponse<LoanDetail> = {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: `/api/v1/loan/${loanId}`,
      message: '대출 상품 상세 조회 성공',
      data: {
        accountName: found.accountName,
        description: `업력 ${6 + (loanId % 3) * 6}개월 이상 소상공인 대상 · 대리대출(시중은행 취급)로 실행돼요.`,
        status: found.status,
        isBookmark: found.isBookmark,
        interestRate: found.interestRate,
        minLoanBalance: Math.round((found.maxLoanBalance * 0.4) / 10_000_000) * 10_000_000,
        maxLoanBalance: found.maxLoanBalance,
        period: 18 + (loanId % 4) * 6,
        firmAge: 6 + (loanId % 3) * 6,
        target: '소상공인',
        rating: ['A', 'B', 'C'][loanId % 3],
      },
      error: null,
    }

    return HttpResponse.json(detail)
  }),
]
