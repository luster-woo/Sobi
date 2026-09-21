import { daysUntil } from '@/features/dashboard/model/format'
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
import { SUPPORT_PROGRAM_TYPE } from '@/shared/types'

const IMMINENT_DAYS = 7

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
  const left = daysUntil(endDate)
  return left >= 0 && left <= IMMINENT_DAYS
}

/** 예비창업자 응답은 마감분까지 섞여 온다(백엔드가 findAllOpen 을 안 쓴다) */
function isOpen(endDate: string | null): boolean {
  return endDate === null || daysUntil(endDate) >= 0
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
  ineligibleProgramCount: number
  unknownProgramCount: number
}

/**
 * 판정 조회가 실패했을 때. 대시보드 응답만으로 그릴 수 있는 것을 그린다.
 *
 * 건수는 추천 목록 길이로 대신한다 — 판정 기준 전체 건수는 목록 API 만 알고,
 * 그것을 못 받은 상황이다.
 */
function toDegradedOwnerDashboard(raw: OwnerDashboardResponse): OwnerDashboardData {
  const loans = compact(raw.suggestLoans.map(toLoan))
  const programs = raw.suggestsupportProgram.map(toSupportProgram)

  return {
    judgement: null,
    loans: { possible: loans.length, total: loans.length, items: loans },
    supportPrograms: { possible: programs.length, total: programs.length, items: programs },
    repayment: toRepayment(raw.repaymentManagement),
    snapshot: toSnapshot(raw),
  }
}

export function toOwnerDashboard(
  raw: OwnerDashboardResponse,
  judged: OwnerJudgement | null,
): OwnerDashboardData {
  if (judged === null) return toDegradedOwnerDashboard(raw)

  const { loans, eligiblePrograms, ineligibleProgramCount, unknownProgramCount } = judged
  const loanPossible = loans.statusCounts.ELIGIBLE
  const loanImpossible = loans.statusCounts.INELIGIBLE
  const programPossible = eligiblePrograms.page.totalElements
  const programTotal = programPossible + ineligibleProgramCount + unknownProgramCount

  return {
    judgement: {
      updatedAt: null,
      possible: loanPossible + programPossible,
      needsCheck: unknownProgramCount,
      urgent: eligiblePrograms.programs.filter((program) => isImminent(program.endDate)).length,
      impossible: loanImpossible + ineligibleProgramCount,
      // 대출만 신청 상태로 빠진다. 공고는 판정값이 그대로 남아 위 셋에 들어간다
      inProgress: loans.totalCount - loanPossible - loanImpossible,
      total: loans.totalCount + programTotal,
    },
    loans: {
      possible: loanPossible,
      total: loans.totalCount,
      items: compact(raw.suggestLoans.map(toLoan)),
    },
    supportPrograms: {
      possible: programPossible,
      total: programTotal,
      items: eligiblePrograms.programs.map(toJudgedSupportProgram),
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
      items: compact(raw.Loans.map(toLoan)),
    },
    supportPrograms: {
      possible: openPrograms.length,
      total: openPrograms.length,
      items: openPrograms.map(toSupportProgram),
    },
    insurances: raw.insurances.map(toInsurance),
  }
}

export type Dashboard =
  { kind: 'owner'; data: OwnerDashboardData } | { kind: 'preOwner'; data: PreOwnerDashboardData }

export function isOwnerResponse(raw: DashboardResponse): raw is OwnerDashboardResponse {
  return 'suggestLoans' in raw
}
