/**
 * 자금 조합 (S15P21D101-200)
 *
 * 목표 금액을 입력하면 서버가 그 금액을 채우는 상품 조합 여러 개를 추천한다.
 * 상환 관리와 달리 금액·금리가 숫자로 오고 형식이 일관돼서 변환 계층이 필요 없다.
 */

/** 조합을 구성하는 상품 하나 */
export interface FundingItem {
  /** 지원사업이면 SUPPORT, 대출이면 LOAN */
  type: 'SUPPORT' | 'LOAN'
  /** supportProgramId 또는 loanId */
  id: number
  name: string
  /**
   * 이 상품에서 끌어오는 금액(원). 상품 한도가 아니라 배분액이고,
   * 조합 내 items 의 합이 totalFinancingAmount 다.
   */
  supportAmount: number
  /**
   * 연 이율(%). 0 이면 무상(보조금)이라 화면에 '무상' 으로 표시한다.
   * type 으로는 가를 수 없다 — SUPPORT 중에도 융자성(이자 있는) 상품이 있다.
   */
  interestRate: number
}

export interface FundingCombination {
  items: FundingItem[]
  /**
   * items 의 supportAmount 합.
   * 상품마다 최소 금액이 있어 목표 금액을 넘길 수 있다.
   */
  totalFinancingAmount: number
  /** 금액으로 가중평균한 연 이율(%) */
  averageInterestRate: number
  /** 월 상환액(원). 서버가 계산해 주는 값을 그대로 보여준다 */
  monthlyRepaymentAmount: number
  /** 총 이자(원) */
  totalInterest: number
}

export interface FundingRecommendData {
  recommendedCombinations: FundingCombination[]
}

/** 추천 요청 */
export interface FundingRecommendParams {
  /** 필요 금액(원) */
  targetAmount: number
}

/** 신청할 조합을 보낼 때의 항목. 금액·이름 없이 식별자만 보낸다 */
export interface FundingBatchItem {
  type: FundingItem['type']
  id: number
}
