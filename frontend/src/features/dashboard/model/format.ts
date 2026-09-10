import { formatMoneyShort } from '@/shared/utils/formatters'

const TEN_THOUSAND = 10_000

/**
 * 카드 아래 금액 줄. `1,000만 원 ~ 1억 원`
 *
 * 상한만 보여주지 않는 이유: '최대 1억' 만 있으면 1,000만 원이 필요한 사람이 이 상품이
 * 자기 것인지 알 수 없다. 하한이 있어야 후보에서 걸러낼 수 있다.
 */
export function toAmountRange(min: number, max: number): string {
  return `${formatMoneyShort(min)} ~ ${formatMoneyShort(max)}`
}

/**
 * 마감일 → '~9.29' · '상시'
 *
 * shared 의 formatDeadline 은 'D-19' 를 준다. 알약에는 남은 날짜보다 날짜 자체가
 * 쓸모 있다 — 'D-19' 는 달력을 열어 계산해야 하고 '~9.29' 는 바로 적을 수 있다.
 */
export function toDeadlineChip(endDate: string | null): string {
  if (!endDate) return '상시'

  const month = Number(endDate.slice(5, 7))
  const day = Number(endDate.slice(8, 10))
  if (Number.isNaN(month) || Number.isNaN(day)) return '-'
  return `~${month}.${day}`
}

/**
 * 원 → 숫자와 단위를 나눈 값. `3_240_000` → `{ value: '324', unit: '만 원' }`
 *
 * shared 의 formatMoneyShort 와 달리 문자열 하나로 합치지 않는다. 대시보드는 숫자를
 * 16px, 단위를 11.5px 로 그려서 한 문자열이면 나눌 수가 없다.
 *
 * ⚠️ 1억 이상에는 쓰지 않는다. '10,000만 원' 이 되어 읽기 어렵다 —
 *    상품 한도처럼 큰 금액은 formatMoneyShort 를 쓴다.
 */
export function toManwon(won: number): { value: string; unit: string } {
  return {
    value: Math.floor(won / TEN_THOUSAND).toLocaleString('ko-KR'),
    unit: '만 원',
  }
}

/** 'YYYY-MM' → '8월'. 스파크라인 눈금이라 연도는 버린다 */
export function toMonthLabel(yearMonth: string): string {
  const month = Number(yearMonth.slice(5, 7))
  return Number.isNaN(month) ? '-' : `${month}월`
}

/** 'YYYY-MM-DD' → '2026. 9. 2'. 갱신 시각처럼 연도가 필요한 자리에 쓴다 */
export function toDotDate(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))
  if (Number.isNaN(month) || Number.isNaN(day)) return '-'
  return `${isoDate.slice(0, 4)}. ${month}. ${day}`
}

/** 'YYYY-MM-DD' → '9. 15'. 다음 상환일처럼 올해 안의 날짜에만 쓴다 */
export function toShortDate(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7))
  const day = Number(isoDate.slice(8, 10))
  if (Number.isNaN(month) || Number.isNaN(day)) return '-'
  return `${month}. ${day}`
}

/**
 * 오늘부터 그 날짜까지 남은 일수. 지난 날짜면 음수다.
 *
 * shared 의 formatDeadline 은 'D-13' 을 주는데 상환일은 '13일 남음' 으로 읽혀야 해서
 * 문구가 아니라 숫자를 돌려준다.
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** 증감률 → '+8%' · '-3%'. 0 은 부호를 붙이지 않는다 */
export function toSignedPercent(rate: number): string {
  if (rate === 0) return '0%'
  return `${rate > 0 ? '+' : '-'}${Math.abs(rate)}%`
}
