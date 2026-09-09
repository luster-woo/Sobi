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
  REVIEW: 'REVIEW', // 검토중
  APPROVED: 'APPROVED', // 선정
} as const

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS]

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  POSSIBLE: '가능',
  IMPOSSIBLE: '불가',
  WRITING: '작성 중',
  SUBMITTED: '신청 완료',
  REVIEW: '검토 중',
  APPROVED: '선정',
}
