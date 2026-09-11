/**
 * 입력값 표시 형식 변환.
 *
 * 검증(validators.ts)과 분리한 이유: 변환은 값을 바꾸고, 검증은 값을 판단합니다.
 * onChange 중에 변환하면 커서 위치가 튀므로 onBlur 시점에 적용하세요.
 *   onBlur={() => setBizNo(formatBizNo(bizNo))}
 */

const TEN_THOUSAND = 10_000
const HUNDRED_MILLION = 100_000_000
const DAY_MS = 86_400_000

/** '1234567890' → '123-45-67890' (10자리가 아니면 원본을 그대로 돌려줍니다) */
export function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10) return value
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/** '01012345678' → '010-1234-5678' (10~11자리가 아니면 원본 그대로) */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return value
}

/** '20230410' → '2023-04-10' (8자리가 아니면 원본 그대로) */
export function formatIsoDate(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/** 남은 초 → 'M:SS' (인증번호 타이머 표시용) */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 원 단위 금액 → 한국식 축약. 서버가 maxLoanBalance 를 원으로 준다.
 *   50_000_000 → '5,000만 원'    100_000_000 → '1억 원'
 *   120_000_000 → '1억 2,000만 원'
 *
 * 만 원 미만은 버립니다. 상품 한도에 1원 단위가 의미 있는 경우가 없습니다.
 */
export function formatMoneyShort(won: number): string {
  if (!Number.isFinite(won) || won < 0) return '-'

  const eok = Math.floor(won / HUNDRED_MILLION)
  const man = Math.floor((won % HUNDRED_MILLION) / TEN_THOUSAND)

  const parts: string[] = []
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)

  if (parts.length === 0) return `${won.toLocaleString('ko-KR')}원`
  return `${parts.join(' ')} 원`
}

/**
 * 접수 마감일 → 'D-10' · 'D-day' · '마감' · '상시'
 *
 * endDate 가 null 이면 '상시' 다. 시작·마감이 둘 다 비면 '예산 소진 시까지' 라는
 * 뜻이라(supportProgram.ts 주석) 화면에는 '상시' 로 보여준다.
 *
 * ⚠️ 접수 시작 전(startDate 가 미래)을 구분하지 않는다. '접수 예정' 표시가 필요한지
 *    기획 확인이 안 돼서 마감일 기준으로만 계산한다.
 */
export function formatDeadline(endDate: string | null, now: Date = new Date()): string {
  if (!endDate) return '상시'

  // 마감일 당일 자정까지를 유효 기간으로 본다
  const end = new Date(`${endDate}T23:59:59`)
  if (Number.isNaN(end.getTime())) return '-'

  const diffMs = end.getTime() - now.getTime()
  if (diffMs < 0) return '마감'

  const days = Math.floor(diffMs / DAY_MS)
  return days === 0 ? 'D-day' : `D-${days}`
}

/**
 * 마감이 임박했는지. 화면에서 빨간색으로 강조할지 판단한다.
 * 이미 마감된 것과 상시 접수는 임박이 아니다
 */
export function isDeadlineNear(
  endDate: string | null,
  withinDays = 7,
  now: Date = new Date(),
): boolean {
  if (!endDate) return false

  const end = new Date(`${endDate}T23:59:59`)
  if (Number.isNaN(end.getTime())) return false

  const diffMs = end.getTime() - now.getTime()
  if (diffMs < 0) return false

  return diffMs <= withinDays * DAY_MS
}

export interface MoneyParts {
  /** '5,000' · '1억 2,000' */
  value: string
  /** '만 원' · '억 원' */
  unit: string
}

/**
 * 금액을 숫자와 단위로 쪼갠다. 큰 숫자 + 작은 회색 단위로 그리는 자리에 쓴다.
 *
 * formatMoneyShort 는 '5,000만 원' 한 문자열을 주는데, 요약 타일·카드처럼 단위만
 * 작게 깔아야 하는 화면에서는 쪼개진 값이 필요하다.
 *
 * 만 원 단위에서 반올림한다. 대출 한도(formatMoneyShort)는 실제보다 크게 보이면
 * 안 되어 버리지만, 이쪽은 추정·집계 금액이라 반올림이 원값에 가깝다.
 *
 * null 을 받는다. 상권 분석의 매출은 원본에서 비어 있는 행이 53% 라 기본 경로에
 * 가깝다. 그 경우 '-' 를 주고 단위를 비운다 — '- 만 원' 이 되면 값이 있는 것처럼 보인다.
 */
export function splitMoneyShort(won: number | null): MoneyParts {
  if (won === null || !Number.isFinite(won) || won < 0) return { value: '-', unit: '' }

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
