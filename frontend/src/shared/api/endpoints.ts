/**
 * 절대주소를 쓰지 않는다. 개발 서버에서 `/api` 가 localhost:8080 으로 프록시되고
 * (`vite.config.ts`), 배포 환경에서는 nginx 가 받는다. 절대주소를 넣으면 둘 다 깨진다.
 */
export const API_BASE_URL = '/api/v1'

/**
 * 엔드포인트 경로. `API_BASE_URL` 이 붙으므로 여기엔 `/api/v1` 을 쓰지 않는다.
 *
 * 백엔드 구현(`AuthController` 등)을 기준으로 한다. Notion 명세와 다르면 구현이 맞다.
 * 각 feature 작업을 시작할 때 여기에 추가한다.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    signUp: '/auth/signup',
    /** refreshToken 쿠키로 accessToken 재발급. 응답에 expiresIn 이 없다 */
    refresh: '/auth/refresh',
    /** query `email`. 응답의 isDuplicate 가 true 면 **이미 쓰는 이메일**이다 */
    emailCheck: '/auth/email/check',
    /** 인증번호 발송. 1분 쿨다운이 있고 걸리면 429 AUTH_002 */
    emailSend: '/auth/email/send',
    /** 가입용 인증번호 검증. 이걸 통과해야 signup 이 된다 */
    emailVerify: '/auth/email/verify',
    /** 재설정용 인증번호 검증. 가입용과 달리 resetToken 을 돌려준다 */
    emailVerifyReset: '/auth/email/verify/reset',
    /** 비밀번호 재설정. resetToken 과 새 비밀번호를 보낸다 */
    passwordReset: '/auth/password/reset',
    /** 소셜 로그인·회원가입. 응답은 `/auth/login` 과 같은 모양 */
    oauth: (provider: string) => `/auth/oauth/${provider}`,
    /** 로컬 → 소셜 전환. **인증 필요** */
    social: (provider: string) => `/auth/social/${provider}`,
  },

  /** ⚠️ 백엔드 `com.sobi.user` 에 controller 가 없다. 목으로만 돈다 (S15P21D101-377) */
  user: {
    /** 로그인한 본인 정보. 세션 복구에서 재발급 직후 호출한다 */
    me: '/user/me',
  },

  business: {
    /** 사이드바 하단 카드에 쓰는 내 업체 정보. 미등록이면 404 BUSINESS_O04 */
    me: '/business/me',
  },

  /**
   * 여러 도메인이 공용으로 쓰는 조회. 업종·지역 코드처럼 화면 하나에 속하지 않는 것들이다.
   * 상권 분석이 여기 있는 건 예비창업자·사업자 양쪽에서 부르기 때문이다.
   */
  common: {
    /** 상권 분석. dongCode·businessCode 는 필수, compareLimit·mixLimit 은 선택 */
    market: '/common/market',
    /** 업종 대/중/소 목록. 트리 하나로 통째로 온다 */
    businesses: '/common/market/businesses',
    /** 서울 자치구 + 행정동 목록. 트리 하나로 통째로 온다 */
    regions: '/common/market/regions',
  },

  loan: {
    /** 대출 상품 목록. 필터·정렬·페이징은 쿼리 파라미터로 붙인다 */
    list: '/loan',
    detail: (loanId: number) => `/loan/${loanId}`,
  },

  /** 마이데이터로 불러온 입출금 계좌. 서버가 COMMON 타입만 걸러서 준다 */
  account: {
    list: '/account/list',
  },

  /**
   * 신청. 생성은 쿼리로 대상을 받고, 나머지는 applicationId 로 가리킨다.
   *
   * 명세에는 경로 변수가 {programId} 로 적혀 있지만 예시 응답의 path 가
   * /application/12 이고 그 12 가 applicationId 다. 확정시 변경할 것.
   */
  application: {
    create: '/application',
    detail: (applicationId: number) => `/application/${applicationId}`,
    cancel: (applicationId: number) => `/application/${applicationId}`,
    /** 최종 신청. body 에 applicationId·applyAmount·accountNo */
    submit: '/application/finan',
    /** 서류 업로드. multipart. 작성 서류도 같은 곳으로 올리고 검증만 안 한다 */
    uploadDocument: '/document',
    /** 작성 서류 초안 생성. 비동기로 돌고 상세 조회로 결과를 받는다 */
    requestDraft: '/document/draft',
  },

  /**
   * 자금 조합. 목표 금액을 채우는 상품 조합을 서버가 추천한다.
   * 조회인데 POST 인 건 요청 body 로 조건을 받기 때문이다.
   */
  funding: {
    /** 조합 추천. body 에 targetAmount */
    recommend: '/funding/recommend',
    /** 고른 조합으로 신청 목록 생성 */
    batch: '/funding/batch',
  },

  /**
   * 상환 관리. 셋 다 POST 다 — 조회도 POST 인 건 SSAFY 금융망 규격을 그대로 따라서다.
   * list 는 본문이 비어 있고, 나머지는 { accountNo } 를 보낸다.
   */
  repayment: {
    /** 내 대출 상품 가입 목록 */
    list: '/repayment/finan/list',
    /** 상환 내역 + 완납 비교. 본문에 accountNo */
    records: '/repayment/finan/records',
    /** 일시납(완납). 본문에 accountNo. 되돌릴 수 없다 */
    loanBalanceInFull: '/repayment/finan/loanBalanceInFull',
  },

  supportProgram: {
    /** 지원사업 목록. 필터·정렬·페이징은 쿼리 파라미터로 붙인다 */
    list: '/support',
    detail: (supportProgramId: number) => `/support/${supportProgramId}`,
    /** 자연어 검색. GET 이 아니라 POST 다 (193) */
    search: '/support/search',
  },

  /**
   * 관심 목록. 대출·지원사업이 한 경로를 겸하고 `type` 쿼리로 갈린다.
   *
   * ⚠️ programId 가 대출 id 와 지원사업 id 를 겸한다. 21번 대출과 21번 지원사업이
   *    둘 다 있을 수 있어 `type` 을 빠뜨리면 엉뚱한 것이 담긴다 — 호출부에서
   *    반드시 같이 보낼 것.
   */
  bookmark: {
    add: (programId: number) => `/bookmark/${programId}`,
    remove: (programId: number) => `/bookmark/${programId}`,
    /** 내 관심 목록. `sort` `page` `size` */
    me: '/bookmark/me',
  },

  insurance: {
    /** 가입해야 하는 것 + 가입한 것을 한 번에 준다. 업종에 걸린 항목이라 페이징이 없다 */
    list: '/insurance',
    /** ⚠️ 경로 변수는 insurance.id 가 아니라 insurance_checklist.id 다 */
    detail: (insuranceChecklistId: number) => `/insurance/${insuranceChecklistId}`,
    changeStatus: (insuranceChecklistId: number) => `/insurance/${insuranceChecklistId}/status`,
  },

  /** role 로 사업자·예비창업자를 갈라 서로 다른 모양을 준다 */
  dashboard: '/dashboard',

  notification: {
    /** 상단바 벨의 미확인 표시용. 목록 전체를 받지 않고 개수만 받는다 */
    unreadCount: '/notifications/unread-count',
    /** 드롭다운을 열 때 받는 목록 */
    list: '/notifications',
    readAll: '/notifications/read-all',
    /** 개별 읽음 처리. 경로에 id 가 들어가 함수다 */
    read: (notificationId: number) => `/notifications/${notificationId}/read`,
  },
} as const

/**
 * 401 을 받아도 토큰 재발급을 시도하지 않을 경로.
 *
 * 로그인 실패와 재발급 실패는 401 이 정상 응답이다. 여기서 재발급을 걸면
 * 비밀번호를 틀린 사용자에게 재발급 요청이 한 번 더 나가고, 그것도 401 이라
 * 세션이 초기화된다.
 */
export const NO_REISSUE_PATHS: readonly string[] = [
  endpoints.auth.login,
  endpoints.auth.signUp,
  endpoints.auth.refresh,
]
