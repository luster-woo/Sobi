import { http } from 'msw'

import type { ApplicationLoanSummary } from '@/features/application/model/types'
import type { LoanDetail, LoanListData, LoanListItem } from '@/features/loan/model/types'
import { isBookmarked } from '@/mocks/lib/bookmarkStore'
import { fail, ok } from '@/mocks/lib/envelope'
import { LOAN_STATUS, type LoanStatus } from '@/shared/constants/productStatus'

const BANKS = ['싸피은행', '기업은행', '대구은행', '소상공인시장진흥공단', '중소벤처기업진흥공단']
/** 생성 상품에 돌아가며 붙인다. 일곱 상태가 화면에 한 번씩은 나오게 전부 넣는다 */
const STATUSES: LoanStatus[] = [
  'ELIGIBLE',
  'INELIGIBLE',
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'PREPARING',
  'PAID',
]

const mockLoans: LoanListItem[] = [
  {
    loanId: 1,
    accountName: '소상공인 성장촉진대출',
    bankName: '싸피은행',
    interestRate: 3.4,
    maxLoanBalance: 100_000_000,
    status: 'SUBMITTED',
    bookmarked: true,
  },
  {
    loanId: 2,
    accountName: '소진공 일반경영안정자금',
    bankName: '소상공인시장진흥공단',
    interestRate: 3.0,
    maxLoanBalance: 70_000_000,
    status: 'ELIGIBLE',
    bookmarked: false,
  },
  {
    loanId: 3,
    accountName: '지역신보 보증부 대출',
    bankName: '대구은행',
    interestRate: 4.1,
    maxLoanBalance: 50_000_000,
    status: 'APPROVED',
    bookmarked: true,
  },
  {
    loanId: 4,
    accountName: '스마트공방 기술향상자금',
    bankName: '중소벤처기업진흥공단',
    interestRate: 2.8,
    maxLoanBalance: 50_000_000,
    status: 'INELIGIBLE',
    bookmarked: false,
  },
  {
    loanId: 5,
    accountName: '청년고용연계자금',
    bankName: '중소벤처기업진흥공단',
    interestRate: 2.5,
    maxLoanBalance: 100_000_000,
    status: 'PREPARING',
    bookmarked: false,
  },
  {
    loanId: 6,
    accountName: '기업은행 소상공인 우대대출',
    bankName: '기업은행',
    interestRate: 3.9,
    maxLoanBalance: 30_000_000,
    status: 'REVIEWING',
    bookmarked: true,
  },
  // 페이징을 확인할 만큼 채웁니다
  ...Array.from({ length: 17 }, (_, index) => ({
    loanId: 100 + index,
    accountName: `소상공인 정책자금 ${index + 1}호`,
    bankName: BANKS[index % BANKS.length],
    interestRate: Number((2 + (index % 20) / 10).toFixed(1)),
    maxLoanBalance: [30_000_000, 50_000_000, 70_000_000, 100_000_000][index % 4],
    status: STATUSES[index % STATUSES.length],
    bookmarked: index % 3 === 0,
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
 * 대출 기간(**일**). 상세와 관심 목록이 같은 값을 보여야 해서 여기서 만든다.
 *
 * 금융망 대출은 일 단위로 매일 한 회차씩 갚는다 — 개월이 아니다.
 */
function periodOf(loanId: number): number {
  return 180 + (loanId % 4) * 90
}

/** 시드 값에 사용자가 누른 것을 덮어쓴다. 목록·상세·관심 목록이 같은 값을 보게 한다 */
function withBookmark(loan: LoanListItem): LoanListItem {
  return { ...loan, bookmarked: isBookmarked('LOAN', loan.loanId, loan.bookmarked) }
}

/**
 * 담기·빼기 목(handlers/bookmark.ts)이 '있는 상품인가' 와 '지금 담겨 있나' 를 묻는다.
 *
 * 시드를 그쪽에서 다시 계산하지 않게 여기서 내준다. 두 벌로 적어 두면 상품을 하나
 * 추가했을 때 목록에는 뜨는데 담으려 하면 404 가 나는 식으로 갈린다.
 */
export function findLoanBookmarkState(loanId: number): { bookmarked: boolean } | null {
  const found = mockLoans.find((loan) => loan.loanId === loanId)
  return found ? { bookmarked: withBookmark(found).bookmarked } : null
}

/**
 * 관심 목록에 담긴 대출. 관심 목록 목(handlers/bookmark.ts)이 가져간다.
 *
 * 응답 모양이 `GET /loan` 과 다르다 — 백엔드 `bookmark/dto/LoanList` 는 `minLoanBalance` ·
 * `period` 가 더 오고 `bookmarked` 가 없다. 담긴 것만 실리므로 서버가 굳이 안 보낸다.
 *
 * ⚠️ status 도 다르다. `BookmarkServiceImpl` 만 `LoanStatus` enum 을 안 쓰고
 *    `"POSSIBLE"` · `"IMPOSSIBLE"` 문자열을 직접 박아 둬서, 그 어긋남까지 흉내 낸다.
 *    프론트가 되돌리는 코드(`features/mypage/api/bookmarks.ts` 의 STATUS_ALIAS)를
 *    실제로 태워 봐야 실서버로 바꿔도 안 깨진다.
 */
export function bookmarkedLoanRows() {
  return mockLoans
    .filter((loan) => withBookmark(loan).bookmarked)
    .map((loan) => ({
      loanId: loan.loanId,
      accountName: loan.accountName,
      bankName: loan.bankName,
      interestRate: loan.interestRate,
      maxLoanBalance: loan.maxLoanBalance,
      minLoanBalance: minBalanceOf(loan.maxLoanBalance),
      period: periodOf(loan.loanId),
      status:
        loan.status === 'ELIGIBLE'
          ? 'POSSIBLE'
          : loan.status === 'INELIGIBLE'
            ? 'IMPOSSIBLE'
            : loan.status,
    }))
}

/**
 * 신청 화면 상단에 쓸 상품 요약. 신청 목(handlers/application.ts)이 가져간다.
 *
 * 두 목이 따로 데이터를 들면 목록에서 고른 상품과 신청 화면의 상품이 어긋난다.
 */
export function findLoanProductSummary(loanId: number): ApplicationLoanSummary | null {
  const found = mockLoans.find((loan) => loan.loanId === loanId)
  if (!found) return null

  return {
    loanId: found.loanId,
    accountName: found.accountName,
    bankName: found.bankName,
    interestRate: found.interestRate,
    minLoanBalance: minBalanceOf(found.maxLoanBalance),
    maxLoanBalance: found.maxLoanBalance,
  }
}

/**
 * 상태별 개수. 서버처럼 일곱 키를 0 으로 깔고 센다 — 해당 상품이 없는 상태도
 * 키가 있어야 화면에서 `statusCounts[value]` 를 그냥 읽을 수 있다.
 */
function countByStatus(loans: LoanListItem[]): Record<LoanStatus, number> {
  const counts = Object.fromEntries(
    Object.values(LOAN_STATUS).map((status) => [status, 0]),
  ) as Record<LoanStatus, number>

  for (const loan of loans) counts[loan.status] += 1
  return counts
}

/**
 * 대출 (loan) 목 핸들러.
 *
 * 응답 모양을 확정 명세에 맞췄다. 페이지네이션이 없고, 대신 필터 적용 전 기준의
 * totalCount·statusCounts 가 함께 온다. 서버가 상태 7개 키를 항상 채워 주므로
 * 여기서도 0 으로 깔아 둔 뒤 센다 — 프론트가 키 존재를 따지지 않게 하기 위함이다.
 */
export const loanHandlers = [
  // GET /api/v1/loan
  http.get('/api/v1/loan', ({ request }) => {
    const url = new URL(request.url)
    const keyword = url.searchParams.get('keyword')
    const bankName = url.searchParams.get('bankName')
    const status = url.searchParams.get('status')
    const bookmarked = url.searchParams.get('bookmarked')
    const sort = url.searchParams.get('sort')

    // 사용자가 누른 담기·빼기를 먼저 반영한다. 안 그러면 표의 리본이 시드에 고정된다
    const loans = mockLoans.map(withBookmark)

    let filtered = loans
    // "검색: 상품명·기관" 이라 두 필드를 함께 본다
    if (keyword) {
      filtered = filtered.filter(
        (loan) => loan.accountName.includes(keyword) || loan.bankName.includes(keyword),
      )
    }
    if (bankName) filtered = filtered.filter((loan) => loan.bankName === bankName)
    if (status) filtered = filtered.filter((loan) => loan.status === status)
    if (bookmarked === 'true') filtered = filtered.filter((loan) => loan.bookmarked)

    /*
     * 방향이 값에 박혀 있다. 서버가 금리는 오름차순, 한도는 내림차순만 준다.
     * 1차 기준이 같을 때 순서가 흔들리지 않게 서버처럼 2차 기준까지 건다.
     */
    filtered = [...filtered].sort((a, b) =>
      sort === 'MAX_BALANCE'
        ? b.maxLoanBalance - a.maxLoanBalance || a.interestRate - b.interestRate
        : a.interestRate - b.interestRate || b.maxLoanBalance - a.maxLoanBalance,
    )

    return ok<LoanListData>(
      {
        // 개수는 필터 전 전체 기준이다
        totalCount: loans.length,
        statusCounts: countByStatus(loans),
        loans: filtered,
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
      // 금융망에 등록되지 않은 상품도 서버가 같은 코드로 처리한다
      return fail(404, 'LOAN_NOT_FOUND', '상품을 찾을 수 없습니다.', `/api/v1/loan/${loanId}`)
    }

    const ratingName = ['A', 'B', 'C'][loanId % 3]
    const firmAge = 1 + (loanId % 3)

    // 최소 한도·기간·업력·등급은 상세에만 있다. loanId 로 값을 흔들어 상품마다 다르게 보이게 했다
    return ok<LoanDetail>(
      {
        loanId,
        accountName: found.accountName,
        bankName: found.bankName,
        description: `업력 ${firmAge}년 이상 소상공인 대상 · 대리대출(시중은행 취급)로 실행돼요.`,
        interestRate: found.interestRate,
        minLoanBalance: minBalanceOf(found.maxLoanBalance),
        maxLoanBalance: found.maxLoanBalance,
        // 금융망 대출은 일 단위다. 매일 한 회차씩 갚는다
        period: periodOf(loanId),
        repaymentMethod: '원리금균등상환',
        conditions: {
          ratingName,
          // loanId 로 흔들어 조건 있는 상품과 없는 상품을 섞는다
          requiresStart: loanId % 2 === 0,
          requiresEmployee: loanId % 3 === 0,
          firmAge,
        },
        status: found.status,
        // 신청에서 온 상태일 때만 신청 id 가 있다. 목에서는 loanId 를 그대로 쓴다
        applicationId: found.status === 'ELIGIBLE' || found.status === 'INELIGIBLE' ? null : loanId,
        // 불가 상품에만 사유를 채운다. 문구 형식은 명세의 예시를 따른다
        ineligibleReasons:
          found.status === 'INELIGIBLE'
            ? [
                `신용등급 ${ratingName} 이상 필요 (현재 D)`,
                `업력 ${firmAge}년 이상 필요 (현재 1년)`,
              ]
            : [],
        bookmarked: withBookmark(found).bookmarked,
      },
      '대출 상품 상세 조회 성공',
      { path: `/api/v1/loan/${loanId}` },
    )
  }),
]
