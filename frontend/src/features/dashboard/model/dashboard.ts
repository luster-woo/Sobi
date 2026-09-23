import { daysUntil } from '@/features/dashboard/model/format'
import { REFERENCE_INSURANCES } from '@/features/dashboard/model/insuranceDetail'
import type {
  DashboardResponse,
  InsuranceResponse,
  LoanItemResponse,
  OwnerDashboardResponse,
  PreOwnerDashboardResponse,
  RepaymentManagementResponse,
  SalesResponse,
  SupportItemResponse,
} from '@/features/dashboard/model/response'
import type {
  BusinessSnapshot,
  DashboardInsurance,
  DashboardLoan,
  DashboardSupportProgram,
  OwnerDashboardData,
  PreOwnerDashboardData,
  RepaymentSummary,
} from '@/features/dashboard/model/types'
import type { LoanListData } from '@/features/loan/model/types'
import type {
  SupportProgramListData,
  SupportProgramListItem,
} from '@/features/support-program/model/types'
import { LOAN_STATUS } from '@/shared/constants/productStatus'
import { SUPPORT_PROGRAM_TYPE } from '@/shared/types'

const IMMINENT_DAYS = 7

/**
 * 스트립에 올리는 카드 수.
 *
 * 건수(`possible`·`total`)는 전체 기준을 그대로 두고 카드만 자른다. 자르지 않으면
 * 예비창업자 화면에 공고 200여 장이 한꺼번에 그려지고, 카드마다 `useBookmarkToggle`
 * 훅이 하나씩 붙는다. 가로 스트립이라 어차피 네댓 장 너머는 스크롤해야 보인다.
 */
const STRIP_ITEMS = 10

function toLoan(raw: LoanItemResponse): DashboardLoan | null {
  if (raw.minLoanBalance === null || raw.maxLoanBalance === null || raw.period === null) return null

  return {
    loanId: raw.loanId,
    accountName: raw.accountName,
    bankName: raw.bankName,
    minLoanBalance: raw.minLoanBalance,
    maxLoanBalance: raw.maxLoanBalance,
    period: raw.period,
    endDate: null,
  }
}

function toSupportProgram(raw: SupportItemResponse): DashboardSupportProgram {
  return {
    supportProgramId: raw.supportProgramId,
    pblancNm: raw.pblancNm,
    jrsdInsttNm: raw.jrsdInsttNm,
    type: raw.interestRateOfSP === null ? SUPPORT_PROGRAM_TYPE.SUPPORT : SUPPORT_PROGRAM_TYPE.LOAN,
    minBalance: raw.min_balance,
    maxBalance: raw.max_balance,
    interestRate: raw.interestRateOfSP,
    endDate: raw.end_date,
  }
}

function toInsurance(raw: InsuranceResponse): DashboardInsurance {
  return {
    insuranceChecklistId: raw.insuranceChecklistId,
    name: raw.insuranceName,
    status: raw.status,
  }
}

function compact<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item !== null)
}

function isImminent(endDate: string | null): boolean {
  if (!endDate) return false

  // 날짜를 못 읽으면 임박으로 세지 않는다. 모르는 것을 급한 것으로 세면 숫자가 부풀 뿐이다
  const left = daysUntil(endDate)
  return left !== null && left >= 0 && left <= IMMINENT_DAYS
}

/**
 * 예비창업자 응답은 마감분까지 섞여 온다(백엔드가 findAllOpen 을 안 쓴다).
 * 날짜를 못 읽으면 남긴다 — 형식이 깨졌다고 실제로 접수 중인 공고를 숨길 수는 없다.
 */
function isOpen(endDate: string | null): boolean {
  if (endDate === null) return true

  const left = daysUntil(endDate)
  return left === null || left >= 0
}

function toSalesChangeRate(sales: SalesResponse[]): number | null {
  if (sales.length < 2) return null

  const previous = sales[sales.length - 2].revenue
  const latest = sales[sales.length - 1].revenue
  if (previous === 0) return null

  return Math.round(((latest - previous) / previous) * 100)
}

function toRepayment(raw: RepaymentManagementResponse): RepaymentSummary | null {
  if (raw.nextRepaymentDate === null) return null

  return {
    nextDate: raw.nextRepaymentDate,
    monthlyAmount: raw.thisMonthRepaymentAmount,
    totalBalance: raw.totalLoanBalance,
    advice: null,
  }
}

function toSnapshot(raw: OwnerDashboardResponse): BusinessSnapshot {
  return {
    updatedAt: null,
    monthlySales: raw.latestMonthlySales,
    salesChangeRate: toSalesChangeRate(raw.recentSalesHistory),
    cashFlowChangeRate: null,
    totalLoanBalance: raw.totalLoanBalance,
    recentSales: raw.recentSalesHistory.map((sales) => ({
      month: sales.period,
      amount: sales.revenue,
    })),
    isLinking: false,
    summary: null,
  }
}

function toJudgedSupportProgram(raw: SupportProgramListItem): DashboardSupportProgram {
  return {
    supportProgramId: raw.supportProgramId,
    pblancNm: raw.pblancNm,
    jrsdInsttNm: raw.jrsdInsttNm,
    type: raw.type,
    minBalance: raw.type === 'ETC' ? null : (raw.minBalance ?? null),
    maxBalance: raw.type === 'ETC' ? null : (raw.maxBalance ?? null),
    interestRate: raw.type === 'LOAN' ? (raw.interestRate ?? null) : null,
    endDate: raw.endDate,
  }
}

/**
 * 대시보드 응답의 지원사업 요약(`supportProgramSummary`)은 판정 status 를 보지 않고
 * 추천 행 전체를 센다. 목록 API 의 판정 필터로 다시 세는 이유다.
 *
 * 세 판정값이 공고 전체를 정확히 나눈다 — 백엔드 `matches()` 가 신청 상태를 빼고
 * `judgement` 만 보고, 판정 행이 없으면 UNKNOWN 이다. 그래서 전체를 따로 묻지 않고
 * 셋을 더한다.
 */
export interface OwnerJudgement {
  loans: LoanListData
  eligiblePrograms: SupportProgramListData
  /** 확인 필요(UNKNOWN). 신청은 열려 있어서 마감 임박 집계에 같이 들어간다 */
  unknownPrograms: SupportProgramListData
  ineligibleProgramCount: number
}

/**
 * 판정 조회가 실패했을 때. 대시보드 응답만으로 그릴 수 있는 것을 그린다.
 *
 * ⚠️ 여기 목록은 **신청 가능한 것이 아니다.** `suggest_supportprogram` 은 판정
 *    status 와 무관하게 추천 행 전체라(`DashboardServiceImpl` 주석) 불가 공고가
 *    섞여 있고 마감 필터도 없다. 그래서 마감만 걸러내고 건수는 '추천' 으로만 쓴다 —
 *    이 모드에서는 스트립 제목도 '지원 가능한' 이 아니어야 한다(`OwnerDashboard`).
 */
function toDegradedOwnerDashboard(raw: OwnerDashboardResponse): OwnerDashboardData {
  const loans = compact(raw.suggestLoans.map(toLoan))
  const programs = raw.suggestsupportProgram
    .filter((program) => isOpen(program.end_date))
    .map(toSupportProgram)

  return {
    judgement: null,
    loans: { possible: loans.length, total: loans.length, items: loans.slice(0, STRIP_ITEMS) },
    supportPrograms: {
      possible: programs.length,
      total: programs.length,
      items: programs.slice(0, STRIP_ITEMS),
    },
    repayment: toRepayment(raw.repaymentManagement),
    snapshot: toSnapshot(raw),
  }
}

export function toOwnerDashboard(
  raw: OwnerDashboardResponse,
  judged: OwnerJudgement | null,
): OwnerDashboardData {
  if (judged === null) return toDegradedOwnerDashboard(raw)

  const { loans, eligiblePrograms, unknownPrograms, ineligibleProgramCount } = judged
  const unknownProgramCount = unknownPrograms.page.totalElements
  const loanPossible = loans.statusCounts.ELIGIBLE
  const loanImpossible = loans.statusCounts.INELIGIBLE
  const eligibleLoanIds = new Set(
    loans.loans.filter((loan) => loan.status === LOAN_STATUS.ELIGIBLE).map((loan) => loan.loanId),
  )
  const programPossible = eligiblePrograms.page.totalElements
  const programTotal = programPossible + ineligibleProgramCount + unknownProgramCount

  return {
    judgement: {
      updatedAt: null,
      possible: loanPossible + programPossible,
      needsCheck: unknownProgramCount,
      // 신청할 수 있는 것 = 가능 + 확인 필요(`canApply`). 둘 다에서 임박을 센다
      urgent: [...eligiblePrograms.programs, ...unknownPrograms.programs].filter((program) =>
        isImminent(program.endDate),
      ).length,
      impossible: loanImpossible + ineligibleProgramCount,
      // 대출만 신청 상태로 빠진다. 공고는 판정값이 그대로 남아 위 셋에 들어간다
      inProgress: loans.totalCount - loanPossible - loanImpossible,
      total: loans.totalCount + programTotal,
    },
    loans: {
      possible: loanPossible,
      total: loans.totalCount,
      /*
       * 카드는 `suggest_loan`(마이데이터 연동 시점 스냅샷)에서 오고 건수는 목록 API 의
       * 실시간 판정에서 온다. 연동 이후 신용등급·업력이 바뀌면 스냅샷에는 지금 불가인
       * 상품이 남아 있어서, '지원 가능한 대출 N건' 아래에 불가 카드가 섞였다.
       * 그래서 지금 ELIGIBLE 인 것만 남긴다 — 한도·기간은 목록 응답에 없어서
       * 카드 자체는 여전히 스냅샷을 써야 한다.
       */
      items: compact(
        raw.suggestLoans.filter((loan) => eligibleLoanIds.has(loan.loanId)).map(toLoan),
      ).slice(0, STRIP_ITEMS),
    },
    supportPrograms: {
      possible: programPossible,
      total: programTotal,
      items: eligiblePrograms.programs.slice(0, STRIP_ITEMS).map(toJudgedSupportProgram),
    },
    repayment: toRepayment(raw.repaymentManagement),
    snapshot: toSnapshot(raw),
  }
}

/**
 * 예비창업자는 판정 결과가 없다. 백엔드가 업종·지역만으로 고른 목록을 그대로 주고
 * 자격을 보지 않으므로, 전부 '확인 필요' 지 '신청 가능' 이 아니다.
 */
export function toPreOwnerDashboard(raw: PreOwnerDashboardResponse): PreOwnerDashboardData {
  const openPrograms = raw.supportProgram.filter((program) => isOpen(program.end_date))
  const loanCount = raw.Loans.length
  const total = loanCount + openPrograms.length

  return {
    condition: { industryMinorId: null, province: '', district: '', dong: '' },
    judgement: {
      updatedAt: null,
      possible: 0,
      needsCheck: total,
      urgent: openPrograms.filter((program) => isImminent(program.end_date)).length,
      impossible: 0,
      inProgress: 0,
      total,
    },
    loans: {
      possible: loanCount,
      total: loanCount,
      items: compact(raw.Loans.map(toLoan)).slice(0, STRIP_ITEMS),
    },
    supportPrograms: {
      possible: openPrograms.length,
      total: openPrograms.length,
      items: openPrograms.slice(0, STRIP_ITEMS).map(toSupportProgram),
    },
    /*
     * 서버는 예비창업자에게 늘 빈 배열을 준다(`business_info` 가 없다). 그때만
     * 프론트 참고 목록으로 대신한다 — 언젠가 서버가 채워 주면 그쪽이 이긴다.
     */
    insurances:
      raw.insurances.length > 0 ? raw.insurances.map(toInsurance) : [...REFERENCE_INSURANCES],
  }
}

export type Dashboard =
  { kind: 'owner'; data: OwnerDashboardData } | { kind: 'preOwner'; data: PreOwnerDashboardData }

export function isOwnerResponse(raw: DashboardResponse): raw is OwnerDashboardResponse {
  return 'suggestLoans' in raw
}
