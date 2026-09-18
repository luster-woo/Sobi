import type { ID, InsuranceStatus, ISODate, YearMonth } from '@/shared/types'

/** 백엔드 `DashboardResponse` 와 1:1. 키 이름이 제각각인 건 `@JsonProperty` 그대로다 */

export interface SalesResponse {
  period: YearMonth
  revenue: number
}

export interface InsuranceResponse {
  insuranceChecklistId: ID
  insuranceName: string
  status: InsuranceStatus
}

export interface SupportSummaryResponse {
  availableCount: number
  imminentCount: number
  unavailableCount: number
  totalCount: number
}

export interface RepaymentManagementResponse {
  nextRepaymentDate: ISODate | null
  thisMonthRepaymentAmount: number
  totalLoanBalance: number
}

export interface LoanItemResponse {
  loanId: ID
  accountName: string
  bankName: string
  interestRate: number | null
  maxLoanBalance: number | null
  minLoanBalance: number | null
  period: number | null
}

export interface SupportItemResponse {
  supportProgramId: ID
  pblancNm: string
  jrsdInsttNm: string
  min_balance: number | null
  max_balance: number | null
  end_date: ISODate | null
  interestRateOfSP: number | null
}

export interface OwnerDashboardResponse {
  recentSalesHistory: SalesResponse[]
  latestMonthlySales: number
  totalLoanBalance: number
  insurances: InsuranceResponse[]
  supportProgramSummary: SupportSummaryResponse
  repaymentManagement: RepaymentManagementResponse
  suggestLoans: LoanItemResponse[]
  suggestsupportProgram: SupportItemResponse[]
}

export interface PreOwnerDashboardResponse {
  insurances: InsuranceResponse[]
  Loans: LoanItemResponse[]
  supportProgram: SupportItemResponse[]
}

export type DashboardResponse = OwnerDashboardResponse | PreOwnerDashboardResponse
