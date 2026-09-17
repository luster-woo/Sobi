/**
 * 쿼리 키.
 *
 * 키를 문자열 배열로 직접 쓰면 무효화할 때 어긋난다. 한쪽은 `['loans', params]`,
 * 다른 쪽은 `['loan', 'list', params]` 로 쓰면 무효화가 안 먹고 화면이 갱신되지 않는다.
 * 그래서 키는 전부 여기서만 만든다.
 *
 * 도메인마다 `all` 을 두는 이유는 앞부분만 맞으면 무효화가 걸리기 때문이다.
 * 대출을 신청한 뒤 목록·상세를 한 번에 갱신할 때:
 *
 *   queryClient.invalidateQueries({ queryKey: queryKeys.loan.all })
 *
 * feature 작업을 시작할 때 여기에 도메인을 추가한다. 형태는 아래 loan 을 따른다.
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    /** 로그인한 본인 정보. 세션 복구(127)에서 쓴다 */
    me: ['auth', 'me'] as const,
  },

  business: {
    all: ['business'] as const,
    /** 사이드바 하단 업체 요약. 업체 정보를 수정하면 여기를 무효화한다 */
    meSummary: ['business', 'me', 'summary'] as const,
  },

  /**
   * 관심 목록. 서버가 페이징·정렬을 받지 않아 목록 키에 파라미터가 없다.
   *
   * 담기·빼기를 하면 관심 목록만 틀어지는 게 아니다. 대출·지원사업 목록의 북마크
   * 아이콘과 `bookmarked` 필터 결과도 같이 낡는다. 그래서 토글 뒤에는 `bookmark.all`
   * 과 함께 `loan.all` · `supportProgram.all` 을 같이 무효화한다 (367).
   */
  bookmark: {
    all: ['bookmark'] as const,
    me: ['bookmark', 'me'] as const,
  },

  /**
   * 의무보험 체크리스트. 업종에 걸린 항목이라 페이징·필터가 없어 목록 키에 파라미터가 없다.
   *
   * 상태를 바꾸면 목록과 상세가 같이 틀어지므로 `all` 로 한 번에 무효화한다.
   */
  insurance: {
    all: ['insurance'] as const,
    list: ['insurance', 'list'] as const,
    /** ⚠️ 경로 변수와 같다 — insurance.id 가 아니라 insurance_checklist.id */
    detail: (insuranceChecklistId: number) =>
      ['insurance', 'detail', insuranceChecklistId] as const,
  },

  notification: {
    all: ['notification'] as const,
    /** 상단바 벨의 미확인 개수. 알림을 읽으면 여기를 무효화한다 */
    unreadCount: ['notification', 'unread-count'] as const,
    /** 드롭다운 목록 */
    list: ['notification', 'list'] as const,
  },

  market: {
    all: ['market'] as const,
    analysis: (params: object) => ['market', 'analysis', params] as const,
    /** 업종·지역 목록. 정적 데이터라 파라미터가 없다 */
    businesses: ['market', 'businesses'] as const,
    regions: ['market', 'regions'] as const,
  },

  /**
   * 자금 조합. 목표 금액을 채우는 상품 조합을 서버가 추천한다.
   * 조회인데 POST 인 건 요청 body 로 조건을 받기 때문이다.
   */
  funding: {
    all: ['funding'] as const,
    /** 목표 금액이 바뀌면 다른 추천이라 키에 넣는다 */
    recommend: (targetAmount: number) => ['funding', 'recommend', targetAmount] as const,
  },

  // 신청 (대출/지원사업)
  account: {
    all: ['account'] as const,
    list: ['account', 'list'] as const,
  },

  /**
   * 마이데이터. 조회 API 가 없어 `link` 는 쿼리 키가 아니라 **뮤테이션 키**로도 쓴다.
   *
   * 연동은 동의 화면에서 쏘고 결과는 수집·판정 화면이 읽는다. 화면이 갈려 있어
   * 뮤테이션 상태를 키로 찾아야 하고(`useMutationState`), 결과 요약은 같은 키로
   * 캐시에 얹어 판정 화면이 꺼내 쓴다.
   */
  mydata: {
    all: ['mydata'] as const,
    link: ['mydata', 'link'] as const,
  },

  application: {
    all: ['application'] as const,
    /** 신청 건마다 캐시가 갈린다. 검증 상태 폴링도 이 키로 무효화한다 */
    detail: (applicationId: number) => ['application', 'detail', applicationId] as const,
    list: ['application', 'list'] as const,
  },

  repayment: {
    all: ['repayment'] as const,
    /** 내 대출 상품 목록 */
    list: ['repayment', 'list'] as const,
    /**
     * 상환 내역. 탭을 바꾸면 accountNo 가 바뀌어야 이전 상품 데이터가 남지 않는다.
     * POST 라도 캐시는 이 키로 갈린다.
     */
    detail: (accountNo: string) => ['repayment', 'detail', accountNo] as const,
  },

  loan: {
    all: ['loan'] as const,
    list: (params: object) => ['loan', 'list', params] as const,
    detail: (loanId: number) => ['loan', 'detail', loanId] as const,
  },

  supportProgram: {
    all: ['supportProgram'] as const,
    list: (params: object) => ['supportProgram', 'list', params] as const,
    detail: (supportProgramId: number) => ['supportProgram', 'detail', supportProgramId] as const,
    /** 자연어 검색 (193). 목록과 엔드포인트·메서드가 달라 키도 나눈다 */
    search: (params: object) => ['supportProgram', 'search', params] as const,
  },
} as const
