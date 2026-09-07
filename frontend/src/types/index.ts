/* ------------------------------------------------------------------
   도메인 타입 — API 응답 스키마 확정 전 목업용 임시 정의.
   백엔드 스키마가 나오면 이 파일만 맞추고 mocks/ 를 갱신한다.
------------------------------------------------------------------ */

/** 자격 판정 결과 (목록 우측 배지) */
export type Judgement = 'possible' | 'impossible' | 'applied' | 'holding'

export type UserRole = 'owner' | 'pre'

export interface User {
  name: string
  email: string
  role: UserRole
  notifyNewNotice: boolean
}

export interface Business {
  storeName: string
  regNo: string
  owner: string
  type: string // 개인사업자·일반과세자
  industry: string // 음식점업 (한식)
  address: string
  openedAt: string // ISO
}

/* ---------- 대출 (loan) ---------- */
export interface Loan {
  id: string
  name: string
  agency: string
  tags: string[]
  rate: number // 3.4
  limitAmount: number // 70_000_000
  minAmount?: number
  deadline: string | null // ISO or null(상시)
  judgement: Judgement
  bookmarked: boolean
  description: string
  repayment: string // "거치 2년· 원리금 균등 3년 (총 5년, 만기 2031. 9. 15)"
  minMonths: number
  target: string
  creditScore: string
  execution: string
  isNew?: boolean
}

/* ---------- 지원 사업 (support) ---------- */
export interface Support {
  id: string
  name: string
  agency: string
  tags: string[]
  type: string // 바우처·보조금·컨설팅·교육
  amountLabel: string // "최대 500만 원" / "1인당 연 720만"
  deadline: string | null // ISO or null(상시)
  judgement: Judgement
  bookmarked: boolean
  description: string
  isNew?: boolean
}

/* ---------- 신청 (application) ---------- */
export type ApplicationStatus = 'executed' | 'paid' | 'rejected' | 'in_review'

export interface ApplicationStep {
  label: string
  date: string | null
  done: boolean
}

export interface Application {
  id: string
  programId: string
  kind: 'loan' | 'support'
  name: string
  amount: number
  appliedAt: string
  receiptNo: string
  status: ApplicationStatus
  steps: ApplicationStep[]
  message?: string
}

/* ---------- 서류 (document) ---------- */
export type DocStatus = 'passed' | 'checking' | 'failed' | 'missing'

export interface SubmitDocument {
  id: string
  name: string
  status: DocStatus
  detail: string
  source: string // 홈택스 · 인터넷등기소
}

export interface WriteDocument {
  id: string
  name: string
}

/* ---------- 상환 (repayment) ---------- */
export interface TransferRecord {
  date: string
  product: string
  amount: number
  status: 'ok' | 'failed'
}

export interface LoanContract {
  id: string
  contractNo: string
  name: string
  agency: string
  principal: number
  balance: number
  monthlyPayment: number
  nextDueDate: string
  firstDueDate: string
  maturity: string
  rate: number
  executedAt: string
  account: { bank: string; masked: string; day: number; retry: number }
  progress: { total: number; done: number; overdue: number }
  records: TransferRecord[]
  overdue?: { date: string; amount: number; days: number; interest: number; nextRetry: string }
}

/* ---------- 계좌 (mydata) ---------- */
export interface DepositAccount {
  id: string
  bank: string
  masked: string
  label: string
  balance: number
  isWithdraw?: boolean
  autoTransfer?: boolean
}

/* ---------- 의무보험 (insurance) ---------- */
export interface Insurance {
  id: string
  name: string
  law: string
  status: 'joined' | 'required'
  description: string
}

/* ---------- 알림 (notification) ---------- */
export interface Notification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

/* ---------- 자금 조합 (funding) ---------- */
export interface FundingItem {
  name: string
  amount: number
  rate: number | null // null = 무상
}

export interface FundingMix {
  id: string
  title: string
  badge?: string
  items: FundingItem[]
  total: number
  avgRate: number
  monthly: number
  totalInterest: number
  summary: string
  notes: string[]
}

/* ---------- 상권 분석 (market) ---------- */
export interface MarketCondition {
  large: string
  mid: string
  small: string
  region: string
  size: string
  budget: string
}

export interface MarketAnalysis {
  condition: MarketCondition
  sameCount: number
  footTraffic: string
  avgRent: string
  avgSales: string
  density: { regionAvg: number; here: number; comment: string }
  composition: { name: string; count: number; ratio: number }[]
  nearby: { dong: string; count: number; traffic: string; rent: string; sales: string }[]
  breakEven: string
}
