/**
 * 상권 분석 화면의 숫자 포맷.
 *
 * 금액 쪼개기는 shared 의 splitMoneyShort 를 쓴다(상환 관리·자금 조합과 공용).
 * 여기에는 상권 분석에만 쓰는 포맷만 남긴다.
 */
import { splitMoneyShort } from '@/shared/utils/formatters'

const TEN_THOUSAND = 10_000

export interface NumberParts {
  value: string
  unit: string
}

/** 191734 → { '19.2', '만 명' } · 868 → { '868', '명' } */
export function toPeopleParts(count: number): NumberParts {
  if (count < TEN_THOUSAND) return { value: count.toLocaleString('ko-KR'), unit: '명' }
  return { value: (count / TEN_THOUSAND).toFixed(1), unit: '만 명' }
}

/** '202602' → '2026년 2분기' */
export function formatDataQuarter(dataQuarter: string): string {
  const year = dataQuarter.slice(0, 4)
  const quarter = Number(dataQuarter.slice(4))
  if (!year || !quarter) return dataQuarter
  return `${year}년 ${quarter}분기`
}

/** 표·문장에 넣을 한 줄 문자열. 25019665 → '2,501만 원' · null → '-' */

export function formatWonText(won: number | null): string {
  const { value, unit } = splitMoneyShort(won)

  return `${value}${unit}`
}

/**
 * 비율을 한 줄로. 17.53 → '17.5%' · null → '-'
 *
 * 서버가 분모 0 일 때 null 을 준다. 그때 '0%' 로 적으면 "폐업률이 0 인 좋은 상권"
 * 으로 읽힌다 — 실제로는 계산할 수 없는 것이라 '-' 로 비워야 한다.
 */
export function formatPercentText(ratio: number | null): string {
  return ratio === null ? '-' : `${ratio.toFixed(1)}%`
}

/** 221 → '221명' · null → '-' */
export function formatPeopleCountText(count: number | null): string {
  return count === null ? '-' : `${count.toLocaleString('ko-KR')}명`
}

/** 191734 → '19.2만 명' */

export function formatPeopleText(count: number): string {
  const { value, unit } = toPeopleParts(count)

  return `${value}${unit}`
}

/**

 * 억 단위로 굵게 자른 문자열. 14142455534 → '141억 원'

 *

 * 상권 전체 매출은 백억 대라 만 원 단위까지 쓰면 '141억 4,245만 원' 이 되어 좁은

 * 자리에 들어가지 않는다. 점포당 매출(formatWonText)과 달리 억에서 끊는다.

 */

export function formatEokText(won: number): string {
  const eok = Math.round(won / 100_000_000)

  return `${eok.toLocaleString('ko-KR')}억 원`
}
