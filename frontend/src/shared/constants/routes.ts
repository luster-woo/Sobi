/**
 * 라우트 경로.
 *
 * 컴포넌트에 문자열을 직접 쓰지 않는다. 경로를 바꿀 때 Link·Navigate 를 전부 찾아
 * 고쳐야 하고, 하나라도 빠지면 타입 에러 없이 조용히 404 가 된다.
 */
export const ROUTES = {
  HOME: '/',

  LOGIN: '/login',
  TERMS: '/terms',
  SIGN_UP: '/signup',
  /** 비로그인 재설정(`/auth/password/reset`). 로그인 상태 변경은 마이페이지의 `/user/password` 다 */
  PASSWORD_RESET: '/password',

  /**
   * 온보딩 — 사업자 인증, 마이데이터 연동. 가입 직후 순서대로 지난다.
   *
   * 휴대폰 본인확인은 경로가 없다. 실제 본인확인처럼 `/verify` 위에 팝업으로 뜬다
   * (`features/auth/components/PhoneVerifyPopup.tsx`).
   */
  BUSINESS_VERIFY: '/verify',
  MYDATA_CONSENT: '/mydata/consent',
  MYDATA_COLLECT: '/mydata/collect',
  /** 온보딩 마지막. 대출 목록이 아니라 마이데이터 job 의 판정 구간이다 */
  MYDATA_JUDGING: '/mydata/judging',

  DASHBOARD: '/dashboard',
  MARKET_ANALYSIS: '/market-analysis',

  LOANS: '/loans',
  LOAN_DETAIL: '/loans/:loanId',
  LOAN_REPAYMENTS: '/repayments',

  /**
   * 신청·서류 제출. '/loans/:loanId' 와는 깊이가 달라 겹치지 않는다.
   *
   * 지원사업도 같은 화면을 쓰지만 경로는 194 에서 따로 추가한다.
   * 목록으로 돌아갈 곳이 달라서 경로를 나누는 게 맞다.
   */
  LOAN_APPLY: '/loans/apply/:applicationId',

  SUPPORT_PROGRAMS: '/support-programs',
  SUPPORT_PROGRAM_DETAIL: '/support-programs/:supportProgramId',

  FUNDING_PLAN: '/funding-plan',
  APPLICATIONS: '/applications',

  MYPAGE: '/mypage',
  /** 즐겨찾기한 대출·지원사업. 마이페이지 바로가기와 사이드바 어디서든 들어온다 */
  MYPAGE_FAVORITES: '/mypage/favorites',
  /** 마이데이터로 불러온 입출금·대출 계좌 */
  MYPAGE_ACCOUNTS: '/mypage/accounts',
} as const

/**
 * 파라미터가 있는 경로는 여기서 만든다.
 * `ROUTES.LOAN_DETAIL` 의 ':loanId' 를 직접 replace 하지 말 것 — 오타가 런타임까지 간다.
 */
export const routeTo = {
  loanDetail: (loanId: number) => `/loans/${loanId}`,
  supportProgramDetail: (supportProgramId: number) => `/support-programs/${supportProgramId}`,
  loanApply: (applicationId: number) => `/loans/apply/${applicationId}`,
} as const
