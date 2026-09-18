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

function toSupportProgram(raw: SupportItemResponse): DashboardSupportProgram | null {
  if (raw.min_balance === null || raw.max_balance === null) return null

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

function toJudgedSupportProgram(raw: SupportProgramListItem): DashboardSupportProgram | null {
  if (raw.type === 'ETC' || raw.minBalance === undefined || raw.maxBalance === undefined) return null

  return {
    supportProgramId: raw.supportProgramId,
    pblancNm: raw.pblancNm,
    jrsdInsttNm: raw.jrsdInsttNm,
    type: raw.type,
    minBalance: raw.minBalance,
    maxBalance: raw.maxBalance,
    interestRate: raw.type === 'LOAN' ? (raw.interestRate ?? null) : null,
    endDate: raw.endDate,
  }
}

/**
 * 대시보드 응답의 지원사업 요약은 판정 status 를 보지 않고 추천 행 전체를 센다.
 * 판정은 전 사업에 행을 남기므로 가능 = 전체, 불가 = 0 이 된다. 목록 API 의 판정 필터로 다시 센다.
 */
export interface OwnerJudgement {
  loans: LoanListData
  eligiblePrograms: SupportProgramListData
  ineligibleProgramCount: number
  programCount: number
}

export function toOwnerDashboard(
  raw: OwnerDashboardResponse,
  judged: OwnerJudgement,
): OwnerDashboardData {
  const { loans, eligiblePrograms, ineligibleProgramCount, programCount } = judged
  const loanPossible = loans.statusCounts.ELIGIBLE
  const programPossible = eligiblePrograms.page.totalElements

  return {
    judgement: {
      updatedAt: null,
      possible: loanPossible + programPossible,
      urgent: eligiblePrograms.programs.filter((program) => isImminent(program.endDate)).length,
      impossible: loans.statusCounts.INELIGIBLE + ineligibleProgramCount,
      total: loans.totalCount + programCount,
    },
    loans: {
      possible: loanPossible,
      total: loans.totalCount,
      items: compact(raw.suggestLoans.map(toLoan)),
    },
    supportPrograms: {
      possible: programPossible,
      total: programCount,
      items: compact(eligiblePrograms.programs.map(toJudgedSupportProgram)),
    },
    repayment: toRepayment(raw.repaymentManagement),
    snapshot: toSnapshot(raw),
  }
}

export function toPreOwnerDashboard(raw: PreOwnerDashboardResponse): PreOwnerDashboardData {
  const loanCount = raw.Loans.length
  const supportCount = raw.supportProgram.length
  const possible = loanCount + supportCount

  return {
    condition: { industryMinorId: null, province: '', district: '', dong: '' },
    judgement: {
      updatedAt: null,
      possible,
      urgent: raw.supportProgram.filter((program) => isImminent(program.end_date)).length,
      impossible: 0,
      total: possible,
    },
    loans: {
      possible: loanCount,
      total: loanCount,
      items: compact(raw.Loans.map(toLoan)),
    },
    supportPrograms: {
      possible: supportCount,
      total: supportCount,
      items: compact(raw.supportProgram.map(toSupportProgram)),
    },
    insurances: raw.insurances.map(toInsurance),
  }
}

export type Dashboard =
  { kind: 'owner'; data: OwnerDashboardData } | { kind: 'preOwner'; data: PreOwnerDashboardData }

export function isOwnerResponse(raw: DashboardResponse): raw is OwnerDashboardResponse {
  return 'suggestLoans' in raw
}
