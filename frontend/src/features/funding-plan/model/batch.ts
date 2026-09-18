import { APPLICATION_SOURCE } from '@/features/application/model/types'
import type { FundingBatchItem, FundingCombination } from '@/features/funding-plan/model/types'
import { FUNDING_SOURCE_TYPE } from '@/features/funding-plan/model/types'

/**
 * 조합 항목 → 신청 생성 요청.
 *
 * sourceType 을 그대로 실으면 안 된다. 조합은 어느 테이블에서 왔는지(LOAN_PRODUCT)를
 * 말하고, 신청은 신청 종류(LOAN)를 말한다. 서버가 이 값을 ApplicationType.from() 에
 * 그대로 넘기는데 그건 LOAN·SUPPORT 만 받아서, 안 바꾸면 APPLICATION_003(400) 이다.
 * 400 티켓에서 SUPPORT_PROGRAM 을 보냈다가 겪은 것과 같은 함정이다.
 *
 * 금액은 담지 않는다. 서버가 신청을 만들 때는 금액을 받지 않고 제출할 때만 받는다.
 */
export function toBatchItems(combination: FundingCombination): FundingBatchItem[] {
  return combination.items.map((item) => ({
    type:
      item.sourceType === FUNDING_SOURCE_TYPE.LOAN_PRODUCT
        ? APPLICATION_SOURCE.LOAN
        : APPLICATION_SOURCE.SUPPORT,
    id: item.id,
  }))
}
