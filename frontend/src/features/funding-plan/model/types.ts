/**
 * 자금 조합 (S15P21D101-200 · 265)
 *
 * 목표 금액을 입력하면 서버가 그 금액을 채우는 상품 조합 여러 개를 추천한다.
 * 금액·금리가 숫자로 오고 형식이 일관돼서 변환 계층이 필요 없다.
 *
 * 백엔드 DTO(FundingRecommendResponse)를 그대로 옮겼다. 명세서 예시와 필드 이름이
 * 다른 곳이 있는데, 실제 구현이 기준이다.
 *   supportAmount → allocatedAmount
 *   type          → sourceType + fundingType 둘로 분리
 */

/** 이 항목이 어느 테이블에서 왔는지. 상세 화면으로 보낼 때 어느 도메인인지 가른다 */
export const FUNDING_SOURCE_TYPE = {
  LOAN_PRODUCT: 'LOAN_PRODUCT',
  SUPPORT_PROGRAM: 'SUPPORT_PROGRAM',
} as const

export type FundingSourceType = (typeof FUNDING_SOURCE_TYPE)[keyof typeof FUNDING_SOURCE_TYPE]

/**
 * 갚아야 하는 돈인지 아닌지.
 *
 * sourceType 과 따로 노는 값이다. 지원사업(SUPPORT_PROGRAM) 중에도 이자를 내는
 * 융자성 상품이 있어서, 무상 여부는 이쪽으로만 판단할 수 있다.
 */
export const FUNDING_TYPE = {
  GRANT: 'GRANT',
  LOAN: 'LOAN',
} as const

export type FundingType = (typeof FUNDING_TYPE)[keyof typeof FUNDING_TYPE]

/** 조합을 구성하는 상품 하나 */
export interface FundingItem {
  sourceType: FundingSourceType
  fundingType: FundingType
  /** loanId 또는 supportProgramId. sourceType 이 어느 쪽인지 알려준다 */
  id: number
  name: string
  /** 이 상품에서 끌어오는 금액(원). 조합 내 합이 totalFinancingAmount 다 */
  allocatedAmount: number
  /**
   * 연 이율(%). 무상이면 0 이다.
   *
   * 서버는 BigDecimal 로 들고 있지만 Jackson 기본 설정이라 JSON 에는 숫자로 나온다
   * (application.yaml 에 문자열 변환 설정이 없다).
   *
   * 다만 무상 판별은 이 값이 아니라 fundingType 으로 한다 — 지원사업 중에도 이자를
   * 내는 융자성 상품이 있어서, 금리 0 이 곧 무상이라는 보장이 없다.
   */
  interestRate: number
}

export interface FundingCombination {
  items: FundingItem[]
  /** items 의 allocatedAmount 합. 상품마다 최소 금액이 있어 목표를 넘길 수 있다 */
  totalFinancingAmount: number
  /** 무상(GRANT) 항목의 합계 */
  grantAmount: number
  /** 갚아야 하는 원금 합계. totalFinancingAmount - grantAmount */
  loanPrincipal: number
  /** 금액으로 가중평균한 연 이율(%) */
  averageInterestRate: number
  /** 월 상환액(원) */
  monthlyRepaymentAmount: number
  /** 총 이자(원) */
  totalInterest: number
  /** 원금 + 이자. loanPrincipal + totalInterest */
  totalRepaymentAmount: number
}

export interface FundingRecommendData {
  /** 요청한 금액을 그대로 돌려준다. 초과 조달분을 계산할 때 쓴다 */
  targetAmount: number
  recommendedCombinations: FundingCombination[]
}

/** 추천 요청 */
export interface FundingRecommendParams {
  /** 필요 금액(원) */
  targetAmount: number
}

/**
 * 신청할 조합을 보낼 때의 항목.
 *
 * ⚠️ /funding/batch 는 아직 컨트롤러가 없다. 명세서 예시(`{ type, id }`)를 따라 뒀고,
 *    구현되면 실제 요청 모양에 맞춰야 한다.
 */
export interface FundingBatchItem {
  type: FundingSourceType
  id: number
}
