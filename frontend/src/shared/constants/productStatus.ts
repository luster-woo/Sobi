/**
 * 자금 상품(대출·지원사업) 카드에 붙는 상태.
 *
 * 조건 판정(가능/불가)과 내 최근 신청 상태를 합친 값이다. 최근 신청이 없거나
 * 반려(REJECTED)면 판정 결과가, 그 외에는 신청 상태가 그대로 온다.
 * 반려는 재신청할 수 있어서 뱃지로 쓰지 않는다 — 가능/불가로 되돌아간다.
 *
 * 대출과 지원사업이 같은 값을 쓴다. 문구만 갈린다.
 *
 * ⚠️ PREPARING 이 신청 건의 ApplicationStatus 에도 있다. 이름만 같고 주는 API 가
 *    다르다 — 이쪽은 상품 목록에 붙는 내 진행 상태고, 그쪽은 신청 한 건의 상태다.
 *    섞어 쓰지 말 것.
 */
export const PRODUCT_STATUS = {
  ELIGIBLE: 'ELIGIBLE', // 가능
  INELIGIBLE: 'INELIGIBLE', // 불가
  PREPARING: 'PREPARING', // 작성중
  SUBMITTED: 'SUBMITTED', // 신청완료
  REVIEWING: 'REVIEWING', // 심사중
  APPROVED: 'APPROVED', // 승인
  PAID: 'PAID', // 지급 완료. 다시 신청할 수 없다
} as const

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS]

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
export const LOAN_STATUS_LABEL: Record<ProductStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '승인',
  PAID: '실행 완료',
}

export const SUPPORT_STATUS_LABEL: Record<ProductStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '선정',
  PAID: '지급 완료',
}
