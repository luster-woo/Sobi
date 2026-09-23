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

const EOK = 100_000_000
/** 이 아래로는 자리수를 밝히지 않는다 */
const MIN_SHOWN_WON = 1_000_000

/**
 * 상권 규모의 금액을 한 줄로. 14142455534 → '141억 원' · 48000000 → '4,800만 원'
 *
 * 규모에 따라 남기는 자리를 바꾼다. 상권 전체 매출은 백억 대라 만 원까지 쓰면
 * '141억 4,245만 원' 이 되어 좁은 자리에 안 들어가고, 반대로 작은 동·업종의 주말
 * 매출은 억 미만이라 억에서 끊으면 통째로 사라진다.
 *
 *   10억 이상   141억 원      천만 원 자리는 전체의 1% 미만이라 적지 않는다
 *   1~10억      4.8억 원      4억과 4.8억은 규모가 다르다
 *   100만 이상  4,800만 원
 *   100만 미만  100만 원 이하
 *
 * ⚠️ 예전에는 전 구간을 `Math.round(won / 1억)` 으로 처리했다. 5천만 원 미만이 전부
 *    '0억 원' 이 되어, 데이터는 멀쩡한데 매출이 없는 것처럼 보였다. 0 은 '집계되지
 *    않음' 과 구분되지 않아서 제일 나쁜 표시였다.
 */
export function formatBigWonText(won: number): string {
  if (!Number.isFinite(won) || won < 0) return '-'

  if (won < MIN_SHOWN_WON) return '100만 원 이하'

  if (won >= 10 * EOK) return `${Math.round(won / EOK).toLocaleString('ko-KR')}억 원`

  if (won >= EOK) {
    // 천만 원 단위까지만 남긴다
    const eok = Math.round(won / (EOK / 10)) / 10
    return `${eok.toLocaleString('ko-KR')}억 원`
  }

  return `${Math.round(won / TEN_THOUSAND).toLocaleString('ko-KR')}만 원`
}
