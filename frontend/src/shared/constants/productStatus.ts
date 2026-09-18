/**
 * 자금 상품(대출·지원사업) 카드에 붙는 상태.
 *
 * 조건 판정과 내 최근 신청 상태를 합친 값이다. 최근 신청이 없거나 반려(REJECTED)면
 * 판정 결과가, 그 외에는 신청 상태가 그대로 온다. 반려는 재신청할 수 있어서 뱃지로
 * 쓰지 않는다 — 판정 결과로 되돌아간다.
 *
 * ⚠️ PREPARING 이 신청 건의 ApplicationStatus 에도 있다. 이름만 같고 주는 API 가
 *    다르다 — 이쪽은 상품 목록에 붙는 내 진행 상태고, 그쪽은 신청 한 건의 상태다.
 *    섞어 쓰지 말 것.
 */
const SHARED_STATUS = {
  ELIGIBLE: 'ELIGIBLE', // 가능
  INELIGIBLE: 'INELIGIBLE', // 불가
  PREPARING: 'PREPARING', // 작성중
  SUBMITTED: 'SUBMITTED', // 신청완료
  REVIEWING: 'REVIEWING', // 심사중
  APPROVED: 'APPROVED', // 승인
  PAID: 'PAID', // 지급 완료. 다시 신청할 수 없다
} as const

export const LOAN_STATUS = SHARED_STATUS

export type LoanStatus = (typeof LOAN_STATUS)[keyof typeof LOAN_STATUS]

/**
 * 지원사업에만 UNKNOWN 이 있다.
 *
 * 대출 판정은 신용등급·업력 같은 정량 비교라 '모른다' 가 나올 수 없다. 지원사업은
 * 공고 문장을 LLM 이 읽어 판정해서, 사람이 직접 확인해야 하는 조건이 남는다.
 * 마이데이터를 연동하지 않았을 때도 이 값이다.
 *
 * 신청은 ELIGIBLE 과 똑같이 열어 둔다. 확실히 안 되는 INELIGIBLE 과 달리 될 수도
 * 있는 것이고, 판정을 못 한 건 우리 사정이지 사용자 잘못이 아니다.
 */
export const SUPPORT_STATUS = {
  ...SHARED_STATUS,
  UNKNOWN: 'UNKNOWN', // 확인 필요
} as const

export type SupportStatus = (typeof SUPPORT_STATUS)[keyof typeof SUPPORT_STATUS]

/** 두 도메인에 공통인 문구. 다른 것만 아래에서 덮어쓴다 */
const SHARED_LABEL = {
  ELIGIBLE: '가능',
  INELIGIBLE: '불가',
  PREPARING: '작성 중',
  SUBMITTED: '신청 완료',
  REVIEWING: '심사 중',
} as const

/**
 * 끝난 상태의 문구가 도메인마다 다르다. 서버가 주는 값은 같고 표현만 갈린다.
 *   대출     실제로 돈이 나간 것 → '실행 완료'
 *   지원사업 지원금·융자를 겸해서 '실행' 이 어색하다 → '지급 완료'
 */
export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '승인',
  PAID: '실행 완료',
}

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '선정',
  PAID: '지급 완료',
  UNKNOWN: '확인 필요',
}

/** 신청을 열어 줄 상태. UNKNOWN 은 ELIGIBLE 과 같게 다룬다 */
export function canApply(status: LoanStatus | SupportStatus): boolean {
  return status === 'ELIGIBLE' || status === 'UNKNOWN' || status === 'PREPARING'
}