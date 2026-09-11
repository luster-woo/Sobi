import type { MarketCondition } from '@/features/market-analysis/model/conditionTypes'

/** 아무것도 안 고른 상태 */
export const EMPTY_CONDITION: MarketCondition = {
  majorCode: '',
  subCode: '',
  minorCode: '',
  districtCode: '',
  dongCode: '',
}

/**
 * URL 쿼리 → 모달 초기값.
 *
 * 조건 재설정으로 열 때 이전에 고른 값이 채워져 있어야 한다. 그런데 URL 에는 서버로
 * 보내는 dongCode·businessCode 만 있고 상위 코드(자치구·대분류·중분류)는 없다.
 * 상위는 트리에서 역으로 찾아야 해서 여기가 아니라 모달에서 채운다.
 */
export function readConditionFromParams(params: URLSearchParams): MarketCondition {
  return {
    ...EMPTY_CONDITION,
    minorCode: params.get('businessCode') ?? '',
    dongCode: params.get('dongCode') ?? '',
  }
}

/**
 * 모달 값 → URL 쿼리.
 *
 * 상위 코드(대분류·중분류·자치구)는 넣지 않는다. 서버가 안 쓰는 값이고, 조건 재설정
 * 때는 트리에서 역으로 찾아 채운다 (MarketConditionModal 의 fillParents).
 */
export function toSearchParams(condition: MarketCondition): URLSearchParams {
  return new URLSearchParams({
    dongCode: condition.dongCode,
    businessCode: condition.minorCode,
  })
}

/** 분석을 시작할 수 있는가. 서버가 둘 다 필수로 받는다 */
export function isSubmittable(condition: MarketCondition): boolean {
  return Boolean(condition.minorCode && condition.dongCode)
}
