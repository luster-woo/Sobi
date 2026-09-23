import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 공고 금액 문구.
 *
 * 서버가 값이 없는 필드를 빼고 주기 때문에(@JsonInclude(NON_NULL)) 금액이 없는 공고가
 * 실제로 온다. 0 으로 채우지 않는다 — '최대 0원' 은 무상 지원으로 읽혀서 없는 것보다
 * 나쁘다. 없으면 없다고 적는다.
 *
 * 목록과 상세가 같은 판단을 해야 해서 한곳에 둔다. 한쪽만 고치면 같은 공고가 화면을
 * 옮길 때 다른 말로 읽힌다.
 */
export function maxBalanceText(maxBalance: number | undefined): string {
  return maxBalance === undefined ? '금액 미정' : `최대 ${formatMoneyShort(maxBalance)}`
}

/** 상세의 '최소 ~ 최대'. 한쪽만 적힌 공고도 있어서 네 갈래다 */
export function balanceRangeText(
  minBalance: number | undefined,
  maxBalance: number | undefined,
): string {
  if (minBalance === undefined && maxBalance === undefined) return '공고문에 적혀 있지 않아요'
  if (minBalance === undefined) return maxBalanceText(maxBalance)
  if (maxBalance === undefined) return `최소 ${formatMoneyShort(minBalance)}`

  return `최소 ${formatMoneyShort(minBalance)} ~ 최대 ${formatMoneyShort(maxBalance)}`
}
