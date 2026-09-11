/**
 * 입력값 표시 형식 변환.
 *
 * 검증(validators.ts)과 분리한 이유: 변환은 값을 바꾸고, 검증은 값을 판단합니다.
 * onChange 중에 변환하면 커서 위치가 튀므로 onBlur 시점에 적용하세요.
 *   onBlur={() => setBizNo(formatBizNo(bizNo))}
 */

const TEN_THOUSAND = 10_000
const HUNDRED_MILLION = 100_000_000

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
 * 접수 마감일 → '~ 9. 16' · '상시 접수'
 *
 * endDate 가 null 이면 '상시 접수' 다. 시작·마감이 둘 다 비면 '예산 소진 시까지' 라는
 * 뜻이라(supportProgram.ts 주석) 화면에는 상시로 보여준다.
 *
 * 'D-10' 을 주지 않는다. 남은 날짜는 달력을 열어 계산해야 하는데 '~ 9. 16' 은 바로
 * 적을 수 있고, 무엇보다 관심 목록·대출·지원사업·상세가 같은 문구를 써야 한다 — 같은
 * 공고가 화면을 옮길 때마다 다른 말로 읽히면 저장해둔 것과 같은 것인지 확인해야 한다.
 *
 * ⚠️ 접수 시작 전(startDate 가 미래)을 구분하지 않는다. '접수 예정' 표시가 필요한지
 *    기획 확인이 안 돼서 마감일만 본다.
 */
export function formatDeadlineDate(endDate: string | null): string {
  if (!endDate) return '상시 접수'

  const month = Number(endDate.slice(5, 7))
  const day = Number(endDate.slice(8, 10))
  if (Number.isNaN(month) || Number.isNaN(day)) return '-'

  return `~ ${month}. ${day}`
}
