/**
 * 상권 분석 화면의 숫자 포맷.
 *
 * 타일·패널이 값과 단위를 따로 그린다(큰 숫자 + 작은 회색 단위). 그래서 완성된 문자열
 * 하나를 주는 shared 의 formatMoneyShort 를 쓸 수 없고, 쪼개서 돌려준다.
 */

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

/**
 * 25019665 → { '2,502', '만 원' } · 120000000 → { '1억 2,000', '만 원' }
 * 100000000 → { '1', '억 원' }
 *
 * 만 원 단위에서 반올림한다. shared 의 formatMoneyShort 는 버림인데(대출 한도를
 * 실제보다 크게 보여주면 안 된다) 이쪽은 추정 통계라 반올림이 원값에 가깝다.
 *
 * 매출은 null 이 올 수 있다(원본의 53%). 그 경우 '-' 를 돌려주고 단위를 비운다 —
 * '- 만 원' 이 되면 값이 있는 것처럼 보인다.
 */
export function toWonParts(won: number | null): NumberParts {
  if (won === null) return { value: '-', unit: '' }

  const man = Math.round(won / TEN_THOUSAND)
  if (man < TEN_THOUSAND) return { value: man.toLocaleString('ko-KR'), unit: '만 원' }

  const eok = Math.floor(man / TEN_THOUSAND)
  const rest = man % TEN_THOUSAND
  if (rest === 0) return { value: eok.toLocaleString('ko-KR'), unit: '억 원' }
  return {
    value: `${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}`,
    unit: '만 원',
  }
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
  const { value, unit } = toWonParts(won)

  return `${value}${unit}`
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
