import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'

/**
 * 신청 시작·제출 실패 안내.
 *
 * 대출에 없던 실패가 지원사업에 있다. 공고에는 모집 기간이 있어서 신청을 시작할 때도
 * 제출할 때도 마감에 걸린다 — 서버가 두 지점에서 각각 검사한다
 * (ApplicationServiceImpl.validateApplicationPeriod).
 *
 * 마감은 다시 눌러도 안 된다. 기본 문구인 '잠시 후 다시 시도해 주세요' 를 그대로 두면
 * 사용자가 계속 누른다. 그래서 두 지점을 따로 둔다 — 같은 코드라도 할 말이 다르다.
 */

/** 두 지점이 같은 뜻으로 쓰는 코드 */
const SHARED: Record<string, string> = {
  [ERROR_CODE.APPLICATION_NOT_FOUND]: '신청을 찾을 수 없어요. 목록에서 다시 들어와 주세요.',
  [ERROR_CODE.APPLICATION_NOT_ELIGIBLE]: '신청 조건을 충족하지 않아요.',
}

const START: Record<string, string> = {
  ...SHARED,
  [ERROR_CODE.APPLICATION_PERIOD_CLOSED]: '접수가 마감된 공고예요.',
  [ERROR_CODE.APPLICATION_ALREADY_IN_PROGRESS]:
    '이미 신청한 상품이에요. 신청 현황에서 확인해 주세요.',
  /*
   * 지원사업 신청인데 코드가 관심 목록 것이다. 백엔드가 createSupportApplication 에서
   * SUPPROT_NOT_FOUND(=BOOKMARK_002) 를 재사용한다. 오타까지 그대로라 헷갈리기 쉽다.
   */
  [ERROR_CODE.BOOKMARK_SUPPORT_NOT_FOUND]: '내려간 공고예요. 목록을 새로고침해 주세요.',
}

const SUBMIT: Record<string, string> = {
  ...SHARED,
  // 시작할 때와 같은 코드지만 상황이 다르다. 여기까지 왔는데 마감된 것이다
  [ERROR_CODE.APPLICATION_PERIOD_CLOSED]: '작성하는 사이에 접수가 마감됐어요.',
  [ERROR_CODE.APPLICATION_SUBMIT_NOT_ALLOWED]: '이미 제출한 신청이에요.',
  [ERROR_CODE.APPLICATION_DOCUMENT_NOT_COMPLETED]:
    '검증을 통과하지 못한 서류가 있어요. 서류 목록을 다시 확인해 주세요.',
  [ERROR_CODE.APPLICATION_AMOUNT_INVALID]: '신청 금액을 다시 확인해 주세요.',
  [ERROR_CODE.APPLICATION_ACCOUNT_INVALID]: '출금 계좌를 다시 선택해 주세요.',
}

const FALLBACK = { 401: '로그인이 필요해요.' }

/** 상세 모달에서 '신청하기' 를 눌렀을 때 */
export function startApplicationErrorMessage(error: unknown): string {
  const code = getErrorCode(error)

  return (code && START[code]) || getErrorMessage(error, FALLBACK)
}

/** 서류 제출 화면에서 최종 신청했을 때 */
export function submitApplicationErrorMessage(
  error: unknown,
  { isLoan }: { isLoan: boolean },
): string {
  const code = getErrorCode(error)

  /*
   * 지원사업에는 금액·계좌 입력이 없다. 그런데도 이 코드가 오면 서버가 아직 '기타' 가
   * 아닌 지원사업에 둘을 요구하는 것이다(submitSupport).
   *
   * 백엔드가 그 분기를 걷어내면 이 가지는 안 탄다.
   */
  if (
    !isLoan &&
    (code === ERROR_CODE.APPLICATION_AMOUNT_INVALID ||
      code === ERROR_CODE.APPLICATION_ACCOUNT_INVALID)
  ) {
    return '지금은 접수할 수 없는 공고예요. 담당 기관에 문의해 주세요.'
  }

  return (code && SUBMIT[code]) || getErrorMessage(error, FALLBACK)
}
