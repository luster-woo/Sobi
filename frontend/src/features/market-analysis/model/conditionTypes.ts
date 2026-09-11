/**
 * 상권 분석 조건 입력 모달이 들고 있는 값.
 *
 * 업종·지역 목록 타입은 shared/types/commonCode.ts 에 있다. 대시보드의 창업 조건
 * 패널도 같은 목록을 쓰기 때문이다. 이 파일에는 모달 전용 상태만 남긴다.
 */

/**
 * 조건 입력 모달이 들고 있는 값.
 *
 * 대분류·중분류·자치구는 하위 목록을 좁히는 용도라 서버로 가지 않는다. 실제로
 * market 에 보내는 건 minorCode 와 dongCode 뿐이다.
 *
 * 시안에 있던 규모(평)·예산은 받지 않는다. 규모는 임대료 추정에, 예산은 자금 추천에
 * 쓰려던 값인데 임대료 데이터가 빠졌고 백엔드에서도 두 값이 제외됐다.
 */
export interface MarketCondition {
  majorCode: string
  subCode: string
  /** market 의 businessCode */
  minorCode: string
  districtCode: string
  /** market 의 dongCode */
  dongCode: string
}
