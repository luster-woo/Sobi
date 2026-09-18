import { http } from 'msw'

import type {
  LoanItemResponse,
  OwnerDashboardResponse,
  PreOwnerDashboardResponse,
  SalesResponse,
  SupportItemResponse,
} from '@/features/dashboard/model/response'
import { currentMockRole, hasMockSession } from '@/mocks/handlers/auth'
import { fail, ok } from '@/mocks/lib/envelope'
import { USER_ROLE } from '@/shared/types'

const PATH = '/api/v1/dashboard'
const DAY_MS = 86_400_000
const IMMINENT_DAYS = 7
const SUPPORT_PROGRAM_TOTAL = 32

/** sessionStorage 에 `msw:dashboard=finance-error` 를 넣으면 금융망 실패(500)를 흉내 낸다 */
const ERROR_KEY = 'msw:dashboard'

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function daysFromNow(days: number) {
  return toIsoDate(new Date(Date.now() + days * DAY_MS))
}

function recentSales(amounts: number[]): SalesResponse[] {
  const now = new Date()
  return amounts.map((revenue, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (amounts.length - index), 1)
    return {
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      revenue,
    }
  })
}

function countImminent(programs: SupportItemResponse[]) {
  const today = toIsoDate(new Date())
  const limit = daysFromNow(IMMINENT_DAYS)
  return programs.filter(
    ({ end_date }) => end_date !== null && end_date >= today && end_date <= limit,
  ).length
}

const OWNER_LOANS: LoanItemResponse[] = [
  {
    loanId: 1,
    accountName: '청년고용연계자금',
    bankName: '중소벤처기업진흥공단',
    interestRate: 2.5,
    minLoanBalance: 10_000_000,
    maxLoanBalance: 100_000_000,
    period: 36,
  },
  {
    loanId: 2,
    accountName: '소상공인 성장촉진자금',
    bankName: '소상공인시장진흥공단',
    interestRate: 3.1,
    minLoanBalance: 10_000_000,
    maxLoanBalance: 100_000_000,
    period: 36,
  },
  {
    loanId: 3,
    accountName: '소상공인 재도전 특별자금',
    bankName: '소상공인시장진흥공단',
    interestRate: 2.8,
    minLoanBalance: 5_000_000,
    maxLoanBalance: 70_000_000,
    period: 36,
  },
  {
    loanId: 4,
    accountName: '지역신보 보증부 대출',
    bankName: '대구신용보증재단',
    interestRate: 4.2,
    minLoanBalance: 5_000_000,
    maxLoanBalance: 50_000_000,
    period: 36,
  },
  {
    loanId: 5,
    accountName: '스마트공장 설비투자자금',
    bankName: '기업은행',
    interestRate: 3.9,
    minLoanBalance: 30_000_000,
    maxLoanBalance: 200_000_000,
    period: 60,
  },
  {
    loanId: 6,
    accountName: '경영개선 운전자금',
    bankName: '신한은행',
    interestRate: 4.5,
    minLoanBalance: 10_000_000,
    maxLoanBalance: 50_000_000,
    period: 48,
  },
]

function ownerSupportPrograms(): SupportItemResponse[] {
  return [
    {
      supportProgramId: 1,
      pblancNm: '고용촉진장려금',
      jrsdInsttNm: '고용노동부',
      min_balance: 3_600_000,
      max_balance: 7_200_000,
      end_date: daysFromNow(3),
      interestRateOfSP: null,
    },
    {
      supportProgramId: 2,
      pblancNm: '소상공인 경영개선 컨설팅',
      jrsdInsttNm: '소상공인시장진흥공단',
      min_balance: 1_000_000,
      max_balance: 3_000_000,
      end_date: daysFromNow(38),
      interestRateOfSP: null,
    },
    {
      supportProgramId: 3,
      pblancNm: '대구 소상공인 이자 지원',
      jrsdInsttNm: '대구광역시',
      min_balance: 500_000,
      max_balance: 2_000_000,
      end_date: daysFromNow(26),
      interestRateOfSP: null,
    },
    {
      supportProgramId: 4,
      pblancNm: '스마트상점 기술보급 사업',
      jrsdInsttNm: '중소벤처기업부',
      min_balance: 1_500_000,
      max_balance: 5_000_000,
      end_date: daysFromNow(6),
      interestRateOfSP: null,
    },
    {
      supportProgramId: 5,
      pblancNm: '중소기업 육성자금 융자',
      jrsdInsttNm: '대구광역시',
      min_balance: 10_000_000,
      max_balance: 50_000_000,
      end_date: daysFromNow(45),
      interestRateOfSP: 2.0,
    },
    {
      supportProgramId: 6,
      pblancNm: '소상공인 특별경영안정자금',
      jrsdInsttNm: '대구광역시',
      min_balance: 10_000_000,
      max_balance: 70_000_000,
      end_date: null,
      interestRateOfSP: 1.8,
    },
    {
      supportProgramId: 7,
      pblancNm: '상권 활성화 교육',
      jrsdInsttNm: '소상공인시장진흥공단',
      min_balance: null,
      max_balance: null,
      end_date: daysFromNow(20),
      interestRateOfSP: null,
    },
  ]
}

function ownerDashboard(): OwnerDashboardResponse {
  const recentSalesHistory = recentSales([
    21_800_000, 26_500_000, 24_900_000, 29_600_000, 30_100_000, 32_400_000,
  ])
  const suggestsupportProgram = ownerSupportPrograms()
  const totalLoanBalance = 55_200_000

  return {
    recentSalesHistory,
    latestMonthlySales: recentSalesHistory[recentSalesHistory.length - 1].revenue,
    totalLoanBalance,
    insurances: [
      { insuranceChecklistId: 1, insuranceName: '국민연금', status: 'COMPLETED' },
      { insuranceChecklistId: 2, insuranceName: '건강보험', status: 'REQUIRED' },
    ],
    supportProgramSummary: {
      availableCount: suggestsupportProgram.length,
      imminentCount: countImminent(suggestsupportProgram),
      unavailableCount: SUPPORT_PROGRAM_TOTAL - suggestsupportProgram.length,
      totalCount: SUPPORT_PROGRAM_TOTAL,
    },
    repaymentManagement: {
      nextRepaymentDate: daysFromNow(1),
      thisMonthRepaymentAmount: 890_000,
      totalLoanBalance,
    },
    suggestLoans: OWNER_LOANS,
    suggestsupportProgram,
  }
}

function preOwnerDashboard(): PreOwnerDashboardResponse {
  return {
    insurances: [
      { insuranceChecklistId: 21, insuranceName: '화재배상책임보험', status: 'NEEDS_VERIFICATION' },
      {
        insuranceChecklistId: 22,
        insuranceName: '가스사고배상책임보험',
        status: 'NEEDS_VERIFICATION',
      },
    ],
    Loans: [
      {
        loanId: 1,
        accountName: '신사업창업사관학교 연계자금',
        bankName: '중소벤처기업진흥공단',
        interestRate: 2.5,
        minLoanBalance: 10_000_000,
        maxLoanBalance: 100_000_000,
        period: 36,
      },
      {
        loanId: 2,
        accountName: '소진공 창업기반자금',
        bankName: '소상공인시장진흥공단',
        interestRate: 3.0,
        minLoanBalance: 10_000_000,
        maxLoanBalance: 70_000_000,
        period: 36,
      },
      {
        loanId: 3,
        accountName: '창업초기 보증부 대출',
        bankName: '대구신용보증재단',
        interestRate: 4.0,
        minLoanBalance: 5_000_000,
        maxLoanBalance: 50_000_000,
        period: 36,
      },
      {
        loanId: 5,
        accountName: '청년전용 창업자금',
        bankName: '중소벤처기업진흥공단',
        interestRate: 2.0,
        minLoanBalance: 10_000_000,
        maxLoanBalance: 100_000_000,
        period: 60,
      },
    ],
    supportProgram: [
      {
        supportProgramId: 1,
        pblancNm: '청년창업사관학교',
        jrsdInsttNm: '중소벤처기업진흥공단',
        min_balance: 30_000_000,
        max_balance: 100_000_000,
        end_date: daysFromNow(41),
        interestRateOfSP: null,
      },
      {
        supportProgramId: 2,
        pblancNm: '신사업창업사관학교',
        jrsdInsttNm: '소상공인시장진흥공단',
        min_balance: 5_000_000,
        max_balance: 20_000_000,
        end_date: daysFromNow(43),
        interestRateOfSP: null,
      },
      {
        supportProgramId: 3,
        pblancNm: '대구 예비창업자 점포 임차료 지원',
        jrsdInsttNm: '대구광역시',
        min_balance: 1_000_000,
        max_balance: 5_000_000,
        end_date: daysFromNow(5),
        interestRateOfSP: null,
      },
    ],
  }
}

export const dashboardHandlers = [
  http.get(PATH, ({ request }) => {
    if (request.headers.get('Authorization') === null && !hasMockSession()) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', PATH)
    }

    const role = currentMockRole()

    if (role === null) {
      return fail(400, 'COMMON_001', '입력값 중에 기준을 만족하지 않은 입력값이 있습니다.', PATH)
    }

    if (role === USER_ROLE.PREENTREPRENEUR) {
      return ok(preOwnerDashboard(), '대시보드 조회에 성공하였습니다.', { path: PATH })
    }

    if (sessionStorage.getItem(ERROR_KEY) === 'finance-error') {
      return fail(500, 'EXTERNAL_001', '금융망 API 호출에 실패했습니다.', PATH)
    }

    return ok(ownerDashboard(), '대시보드 조회에 성공하였습니다.', { path: PATH })
  }),
]
