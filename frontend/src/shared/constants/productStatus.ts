/**
 * 자금 상품(대출·지원사업) 카드에 붙는 상태. API 명세의 status 값을 그대로 씁니다.
 *
 * ⚠️ 서버 응답 필드의 타입이라 원래는 shared/types 에 있어야 합니다. 지원사업 목록
 *    응답 타입(124)이 아직 갱신되지 않아 여기 둡니다. types 가 갱신되면 값 정의는
 *    그쪽으로 옮기고 이 파일에는 라벨만 남깁니다.
 */
export const PRODUCT_STATUS = {
  POSSIBLE: 'POSSIBLE', // 가능
  IMPOSSIBLE: 'IMPOSSIBLE', // 불가능
  WRITING: 'WRITING', // 작성중
  SUBMITTED: 'SUBMITTED', // 신청 완료
  REVIEWING: 'REVIEWING', // 검토중
  APPROVED: 'APPROVED', // 선정
} as const

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS]

/** 값에 공통인 라벨. APPROVED 만 도메인마다 다르다 */
const SHARED_LABEL = {
  POSSIBLE: '가능',
  IMPOSSIBLE: '불가',
  WRITING: '작성 중',
  SUBMITTED: '신청 완료',
  REVIEWING: '검토 중',
} as const

/**
 * APPROVED 의 뜻이 도메인마다 다르다. 서버가 주는 값은 같고 문구만 갈린다.
 *   대출     승인돼서 이미 받은 상품 → '보유중'
 *   지원사업 지원금·지원대출·기타를 겸해서 '보유' 라는 말이 어색하다 → '선정'
 */
export const LOAN_STATUS_LABEL: Record<ProductStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '보유중',
}

export const SUPPORT_STATUS_LABEL: Record<ProductStatus, string> = {
  ...SHARED_LABEL,
  APPROVED: '선정',
}
