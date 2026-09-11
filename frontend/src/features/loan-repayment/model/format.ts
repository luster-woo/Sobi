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
 * 계좌번호 뒷자리만. '0324003842129948' → '****-9948'
 *
 * 전체를 보여줄 이유가 없고, 로그인한 본인 화면이라도 화면 공유·어깨너머로 새어 나간다.
 */
export function maskAccountNo(accountNo: string): string {
  const tail = accountNo.slice(-4)
  return tail ? `****-${tail}` : '-'
}
