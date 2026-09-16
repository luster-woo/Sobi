/**
 * 상환 관리 화면의 표시 포맷.
 *
 * 금액 쪼개기는 shared 의 splitMoneyShort 를 쓴다(상권 분석·자금 조합과 공용).
 * 여기에는 상환 관리에만 쓰는 포맷만 남긴다.
 */
import { splitMoneyShort } from '@/shared/utils/formatters'

/** 표·문장용 한 줄. 25200000 → '2,520만 원' */
export function formatWonText(won: number): string {
  const { value, unit } = splitMoneyShort(won)
  return `${value}${unit}`
}

/** '2026-08-11' → '2026. 8. 11' */
export function formatDotDate(isoDate: string | null): string {
  if (!isoDate) return '-'
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return '-'
  return `${year}. ${Number(month)}. ${Number(day)}`
}

/**
 * 계좌번호 마스킹.
 *
 * 구현은 `shared/utils/mask.ts` 로 옮겼다 — 신청 화면도 같은 값을 그대로 노출하고
 * 있어서 상환 화면 전용으로 둘 이유가 없었다 (S15P21D101-395).
 *
 * 여기서 다시 내보내는 이유는 이 파일을 쓰던 세 컴포넌트의 import 를 건드리지 않기
 * 위해서다. 새 코드는 `shared/utils/mask` 에서 바로 가져다 쓸 것.
 */
export { maskAccountNo } from '@/shared/utils/mask'
