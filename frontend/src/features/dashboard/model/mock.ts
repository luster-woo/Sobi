import type { OwnerDashboardData, SalesPoint } from '@/features/dashboard/model/types'
import { INSURANCE_STATUS, type ISODate, type YearMonth } from '@/shared/types'

/**
 * 사업자 대시보드 목 데이터. 리디자인 시안 10번의 값을 그대로 옮겼다.
 *
 * MSW 핸들러로 만들지 않은 이유: `GET /dashboard` 가 명세에 *(임시)* 로만 적혀 있어
 * 응답 모양이 없다. 지금 핸들러를 만들면 계약이 확정될 때 목과 타입을 두 번 고친다.
 *
 * ⚠️ 삭제 대상. `GET /dashboard` 가 붙으면 이 파일을 통째로 지우고 useQuery 로 바꾼다.
 *    그때 지울 것이 이 파일 하나로 끝나도록 컴포넌트에는 값을 남기지 않았다.
 */

const DAY_MS = 86_400_000

/** Date → 'YYYY-MM-DD'. toISOString 은 UTC 라 한국 시간 오전에 하루 전 날짜가 나온다 */
function toIsoDate(date: Date): ISODate {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * 마감일을 고정 날짜로 적지 않고 오늘 기준으로 만든다.
 * '2026-09-15' 로 박아두면 그 날이 지나는 순간 목 전체가 '마감' 으로 바뀐다.
 */
function daysFromNow(days: number): ISODate {
  return toIsoDate(new Date(Date.now() + days * DAY_MS))
}

/** 지난달부터 거꾸로 세어 오래된 달이 앞에 오게 돌려준다 */
function recentMonths(count: number): YearMonth[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index), 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

/** 시안 스파크라인의 막대 높이(20·25·23·29·33·38)에 맞춘 금액 */
const SALES_AMOUNTS = [21_800_000, 26_500_000, 24_900_000, 29_600_000, 30_100_000, 32_400_000]

const RECENT_SALES: SalesPoint[] = recentMonths(SALES_AMOUNTS.length).map((month, index) => ({
  month,
  amount: SALES_AMOUNTS[index],
}))

export const MOCK_OWNER_DASHBOARD: OwnerDashboardData = {
  judgement: {
    // 온보딩 직후 도착하는 화면이라 판정 근거가 오늘 데이터다
    updatedAt: daysFromNow(0),
    possible: 18,
    urgent: 5,
    impossible: 34,
    total: 52,
  },

  loans: {
    possible: 6,
    total: 20,
    items: [
      {
        loanId: 1,
        accountName: '청년고용연계자금',
        bankName: '중소벤처기업진흥공단',
        minLoanBalance: 10_000_000,
        maxLoanBalance: 100_000_000,
        period: 36,
        endDate: daysFromNow(5),
        isBookmark: false,
      },
      {
        loanId: 2,
        accountName: '소상공인 성장촉진자금',
        bankName: '소상공인시장진흥공단',
        minLoanBalance: 10_000_000,
        maxLoanBalance: 100_000_000,
        period: 36,
        endDate: daysFromNow(53),
        isBookmark: false,
      },
      {
        loanId: 3,
        accountName: '소상공인 재도전 특별자금',
        bankName: '소상공인시장진흥공단',
        minLoanBalance: 5_000_000,
        maxLoanBalance: 70_000_000,
        period: 36,
        endDate: null,
        isBookmark: true,
      },
      {
        loanId: 4,
        accountName: '지역신보 보증부 대출',
        bankName: '대구신용보증재단',
        minLoanBalance: 5_000_000,
        maxLoanBalance: 50_000_000,
        period: 36,
        endDate: null,
        isBookmark: true,
      },
      {
        loanId: 5,
        accountName: '스마트공장 설비투자자금',
        bankName: '기업은행',
        minLoanBalance: 30_000_000,
        maxLoanBalance: 200_000_000,
        period: 60,
        endDate: daysFromNow(21),
        isBookmark: false,
      },
      {
        loanId: 6,
        accountName: '경영개선 운전자금',
        bankName: '신한은행',
        minLoanBalance: 10_000_000,
        maxLoanBalance: 50_000_000,
        period: 48,
        endDate: daysFromNow(14),
        isBookmark: false,
      },
    ],
  },

  supportPrograms: {
    possible: 12,
    total: 32,
    items: [
      {
        supportProgramId: 1,
        pblancNm: '고용촉진장려금',
        jrsdInsttNm: '고용노동부',
        type: 'SUPPORT',
        minBalance: 3_600_000,
        maxBalance: 7_200_000,
        interestRate: null,
        endDate: daysFromNow(3),
        isBookmark: false,
      },
      {
        supportProgramId: 2,
        pblancNm: '소상공인 경영개선 컨설팅',
        jrsdInsttNm: '소상공인시장진흥공단',
        type: 'ETC',
        minBalance: 1_000_000,
        maxBalance: 3_000_000,
        interestRate: null,
        endDate: daysFromNow(38),
        isBookmark: false,
      },
      {
        supportProgramId: 3,
        pblancNm: '대구 소상공인 이자 지원',
        jrsdInsttNm: '대구광역시',
        type: 'SUPPORT',
        minBalance: 500_000,
        maxBalance: 2_000_000,
        interestRate: null,
        endDate: daysFromNow(26),
        isBookmark: true,
      },
      {
        supportProgramId: 4,
        pblancNm: '스마트상점 기술보급 사업',
        jrsdInsttNm: '중소벤처기업부',
        type: 'SUPPORT',
        minBalance: 1_500_000,
        maxBalance: 5_000_000,
        interestRate: null,
        endDate: daysFromNow(11),
        isBookmark: false,
      },
      {
        // 지원대출이라 금리가 있다. 금리 알약이 붙는 유일한 유형
        supportProgramId: 5,
        pblancNm: '중소기업 육성자금 융자',
        jrsdInsttNm: '대구광역시',
        type: 'LOAN',
        minBalance: 10_000_000,
        maxBalance: 50_000_000,
        interestRate: 2.0,
        endDate: daysFromNow(45),
        isBookmark: false,
      },
      {
        supportProgramId: 6,
        pblancNm: '소상공인 특별경영안정자금',
        jrsdInsttNm: '대구광역시',
        type: 'LOAN',
        minBalance: 10_000_000,
        maxBalance: 70_000_000,
        interestRate: 1.8,
        endDate: null,
        isBookmark: false,
      },
    ],
  },

  repayment: {
    nextDate: daysFromNow(13),
    monthlyAmount: 890_000,
    totalBalance: 55_200_000,
    advice: '매출이 5개월 연속 올랐어요 · 금리 인하 요구 가능',
  },

  insurances: [
    {
      insuranceId: 1,
      name: '화재배상책임보험',
      law: '다중이용업소법',
      status: INSURANCE_STATUS.COMPLETED,
    },
    {
      insuranceId: 2,
      name: '가스사고배상책임보험',
      law: '액화석유가스법',
      status: INSURANCE_STATUS.REQUIRED,
    },
  ],

  snapshot: {
    updatedAt: daysFromNow(0),
    monthlySales: 32_400_000,
    salesChangeRate: 8,
    cashFlowChangeRate: 12,
    totalLoanBalance: 55_200_000,
    recentSales: RECENT_SALES,
    isLinking: true,
    summary: '현금 흐름 +12% · 3개월 연속 개선 · 대출 2건',
  },
}
