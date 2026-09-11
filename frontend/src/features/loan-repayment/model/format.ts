/**
 * 상환 관리 화면의 표시 포맷.
 *
 * shared 의 formatMoneyShort 는 '2,520만 원' 한 문자열을 주는데, 요약 타일은 숫자와
 * 단위를 따로 그린다(큰 숫자 + 작은 회색 단위). 그래서 쪼개서 돌려주는 함수가 따로 있다.
 * 상권 분석의 model/format.ts 와 같은 이유·같은 모양이다.
 */

const TEN_THOUSAND = 10_000

export interface NumberParts {
  value: string
  unit: string
}

/** 25200000 → { '2,520', '만 원' } · 100000000 → { '1', '억 원' } */
export function toWonParts(won: number): NumberParts {
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

/** 표·문장용 한 줄. 25200000 → '2,520만 원' */
export function formatWonText(won: number): string {
  const { value, unit } = toWonParts(won)
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
