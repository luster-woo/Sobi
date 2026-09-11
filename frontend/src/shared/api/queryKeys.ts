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
