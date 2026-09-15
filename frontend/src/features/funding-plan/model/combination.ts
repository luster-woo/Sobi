import type { FundingItem } from '@/features/funding-plan/model/types'
import { FUNDING_TYPE } from '@/features/funding-plan/model/types'

/**
 * 갚지 않아도 되는 돈인지.
 * 서버가 fundingType 주는걸로 판별
 */
export function isGrant(item: FundingItem): boolean {
  return item.fundingType === FUNDING_TYPE.GRANT
}

/** '무상' 또는 '연 3.4%' */
export function formatItemRate(item: FundingItem): string {
  return isGrant(item) ? '무상' : `연 ${item.interestRate}%`
}

/*
 * 시안에 있었지만 빼기로 한 것들. 다시 꺼낼 때 판단을 처음부터 다시 하지 않도록
 * 이유를 남겨둔다.
 *
 * 정렬 드롭다운 ('이자 적은 순')
 *   조합이 두세 개뿐이라 정렬할 이유가 없다. 비교표에 전부 나란히 보인다.
 *
 * '이자 최소' 배지
 *   서버가 특징 태그를 주지 않아 프론트가 계산해야 하는데, 조합이 적어서
 *   사용자가 숫자를 직접 보고 판단하는 편이 낫다고 봤다.
 *
 * 조합별 추천 사유 문구
 *   "무상 바우처를 먼저 채워 대출 원금 자체를 줄였어요" 같은 문장은 서버의 추천
 *   근거다. 응답에 없어서 프론트가 지어내면 실제 로직과 다른 말을 하게 된다.
 *
 *   나중에 되살릴 때는 서버가 완성된 문장을 주는 것보다, 이유 코드와 숫자를 주고
 *   프론트가 문장을 만드는 편이 낫다. 판단은 서버가, 말투는 화면이 갖는다.
 *     reasons: [{ code: 'GRANT_FIRST', amount: 5000000 }, ...]
 *
 *   백엔드 작업 없이 지금 넣을 수 있는 것도 있다. 응답만 보면 알 수 있는 사실
 *   서술이라 거짓이 될 여지가 없다.
 *     "무상 포함 여부 · 상품 개수(심사 기관 수) · 목표 금액 초과분"
 *   특히 초과분은 요청과 응답을 대조해야 나오는 값이라 프론트만 알 수 있다.
 */
