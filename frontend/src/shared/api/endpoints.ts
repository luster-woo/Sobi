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

  user: {
    /**
     * 로그인한 본인 정보. 세션 복구에서 재발급 직후 호출한다.
     *
     * ⚠️ **GET 은 아직 백엔드에 없다.** `UserController` 에 `DELETE /user/me` 는 있지만
     *    같은 경로의 GET 매핑이 없어 목으로만 돈다 (S15P21D101-377).
     */
    me: '/user/me',
    /**
     * 회원 탈퇴. 되돌릴 수 없다.
     *
     * 서버가 `deleted_at` 을 채우고 refreshToken 을 지운 뒤, 응답에 쿠키 만료 헤더를
     * 실어 보낸다 — 프론트는 메모리에 남은 세션만 치우면 된다.
     */
    withdraw: '/user/me',
    /**
     * 비밀번호 변경. body 는 `{ password }` — **새 비밀번호 하나뿐이다.**
     *
     * ⚠️ 현재 비밀번호를 받지 않는다. 백엔드 `PasswordChangeReqeust` 에 필드가 없어서
     *    로그인만 돼 있으면 바로 바뀐다. 화면에서 현재 비밀번호를 물어도 서버로 보낼
     *    곳이 없어 검증되지 않으므로, 묻는 척하지 않기로 했다 (S15P21D101-379).
     *    백엔드에 `currentPassword` 가 생기면 그때 입력칸을 되살린다.
     */
    password: '/user/password',
    /**
     * 새 공고 알림 수신 토글. body 가 없다 — 서버가 현재 값을 뒤집고 결과를 준다.
     */
    notification: '/user/notification',
    /**
     * 생년월일만 저장. body·응답 모두 `{ birthDate }`.
     *
     * ⚠️ **지금은 아무도 안 쓴다.** 이름까지 같이 받기로 하면서 아래 `profile` 로
     *    옮겼다. 백엔드에는 아직 살아 있어서 남겨 둔다 — `profile` 이 올라오면 지운다.
     */
    birthDate: '/user/birth-date',
    /**
     * 구글 가입자의 이름·생년월일 저장. body·응답 모두 `{ name, birthDate }`.
     *
     * 구글은 생일을 주지 않고(가입 시 null), 이름은 구글 프로필 이름이 들어가 있어
     * 실명이 아닐 수 있다. 둘을 한 요청으로 받는다 — 나눠 보내면 한쪽만 저장된 상태를
     * 화면이 설명할 방법이 없다.
     *
     * 검증은 `name` 이 `@NotBlank @Size(max = 100)`(SignupRequest 와 동일),
     * `birthDate` 가 `@NotNull @Past`(BirthDateRequest 와 동일).
     *
     * ⚠️ **백엔드 작업 대기 중.** 현재 `UserController` 에는 `/birth-date` 만 있다.
     *    그때까지 목이 받는다 — `mocks/lib/serverFirst.ts` 의 `MOCK_ONLY` 참고.
     */
    profile: '/user/profile',
  },

  business: {
    /** 국세청 진위확인. body 는 `{ brn, name, openDate }` — 대표자명 필드가 `name` 이다 */
    verify: '/business/verify',
    /**
     * 업체 등록. body 는 `{ brn }` 하나뿐이고 나머지는 서버가 `verify` 에서 채운다.
     * 성공하면 서버가 role 을 ENTREPRENEUR 로 바꾼다 — 새 토큰을 받아야 반영된다.
     */
    register: '/business',
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
    /** 최종 신청. 본문에 amount·accountId */
    submit: (applicationId: number) => `/application/${applicationId}/submit`,
    /** ⚠️ 412 대기. 서버에 아직 multipart 엔드포인트가 없다 */
    uploadDocument: '/document',
    /** ⚠️ 413 대기. 서버에 아직 없다 */
    requestDraft: '/document/draft',
    /** 내 신청 목록. 신청 현황 화면이 쓴다 */
    list: '/application',
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
   *
   * ⚠️ `type` 에 보내는 값은 `SUPPORT` 다. 백엔드 `BookmarkServiceImpl` 이
   *    `"LOAN"` · `"SUPPORT"` 두 문자열만 받고 나머지는 400 을 준다.
   */
  bookmark: {
    /** query `type`. 이미 담긴 것을 또 담으면 409 BOOKMARK_003 */
    add: (programId: number) => `/bookmark/${programId}`,
    /** query `type`. 담기지 않은 것을 빼면 404 BOOKMARK_005 */
    remove: (programId: number) => `/bookmark/${programId}`,
    /**
     * 내 관심 목록. 대출과 지원사업을 `{ loanList, supportProgramList }` 두 배열로 나눠 준다.
     *
     * 페이징·정렬이 없다. 저장해둔 것 전부가 한 번에 온다 — `BookmarkController.getBookmark`
     * 가 파라미터를 하나도 받지 않는다. 저장 개수가 많아져 잘라야 하면 백엔드부터 고쳐야 한다.
     */
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
