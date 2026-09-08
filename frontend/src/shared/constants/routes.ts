/**
 * 라우트 경로.
 *
 * 컴포넌트에 문자열을 직접 쓰지 않는다. 경로를 바꿀 때 Link·Navigate 를 전부 찾아
 * 고쳐야 하고, 하나라도 빠지면 타입 에러 없이 조용히 404 가 된다.
 */
export const ROUTES = {
  HOME: '/',

  LOGIN: '/login',
  SIGN_UP: '/signup',
  ONBOARDING: '/onboarding',

  DASHBOARD: '/dashboard',
  MARKET_ANALYSIS: '/market-analysis',

  LOANS: '/loans',
  LOAN_DETAIL: '/loans/:loanId',
  LOAN_REPAYMENTS: '/repayments',

  SUPPORT_PROGRAMS: '/support-programs',
  SUPPORT_PROGRAM_DETAIL: '/support-programs/:supportProgramId',

  FUNDING_PLAN: '/funding-plan',
  APPLICATIONS: '/applications',
  MYPAGE: '/mypage',
} as const

/**
 * 파라미터가 있는 경로는 여기서 만든다.
 * `ROUTES.LOAN_DETAIL` 의 ':loanId' 를 직접 replace 하지 말 것 — 오타가 런타임까지 간다.
 */
export const routeTo = {
  loanDetail: (loanId: number) => `/loans/${loanId}`,
  supportProgramDetail: (supportProgramId: number) => `/support-programs/${supportProgramId}`,
} as const
