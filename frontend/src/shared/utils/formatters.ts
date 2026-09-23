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
export function formatMoneyShort(won: number | null | undefined): string {
  /*
   * null 을 받는다. 지원사업 금액은 공고 원문에 안 적혀 있으면 서버가 필드를 아예
   * 빼고 준다(`@JsonInclude(NON_NULL)`) — 부르는 쪽마다 `?? 0` 을 붙이면 '0원' 이라는
   * 없는 사실을 그리게 된다. 여기서 '-' 로 받는 편이 낫다.
   */
  if (won === null || won === undefined) return '-'
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
  // Number('') 는 0 이라 자른 뒤 isNaN 으로만 막으면 '~ 0. 0' 이 나온다
  if (!/^\d{4}-\d{2}-\d{2}/.test(endDate)) return '-'

  const month = Number(endDate.slice(5, 7))
  const day = Number(endDate.slice(8, 10))
  if (Number.isNaN(month) || Number.isNaN(day)) return '-'

  return `~ ${month}. ${day}`
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

/** 한 자리 숫자의 한글. 0 은 읽지 않는다 */
const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
/** 네 자리 안에서의 자리 이름 */
const KOREAN_PLACES = ['', '십', '백', '천']
/** 네 자리씩 끊었을 때의 단위 */
const KOREAN_GROUPS = ['', '만', '억', '조']

/** 네 자리 이하를 읽는다. 1000 → '일천' */
function readKoreanGroup(group: number): string {
  let text = ''

  for (let place = KOREAN_PLACES.length - 1; place >= 0; place -= 1) {
    const digit = Math.floor(group / 10 ** place) % 10
    if (digit === 0) continue
    text += KOREAN_DIGITS[digit] + KOREAN_PLACES[place]
  }

  return text
}

/**
 * 원 단위 금액 → 한글 병기. 10_000_000 → '일천만 원'
 *
 * 입력한 금액 옆에 적어 자릿수를 잘못 센 것을 바로 알아채게 한다. 대출 한도가
 * '500만 ~ 8,000만' 이라 0 하나가 더 붙거나 빠지면 천만과 억을 오가는데, 콤마만으로는
 * 그 차이가 눈에 잘 안 들어온다.
 *
 * 수표 표기 관행대로 앞자리 일을 살린다 — '천만' 이 아니라 '일천만' 이다. 한 글자를
 * 덧대는 것만으로 앞에 숫자가 더 있었는지 확인할 수 있다.
 *
 * formatMoneyShort 와 달리 1원 단위까지 읽는다. 저쪽은 상품 한도를 어림으로 보여주는
 * 자리지만, 이쪽은 사용자가 방금 친 값을 되읽어 주는 자리라 버리면 안 된다.
 *
 * 0 이하와 조 단위를 넘는 값은 빈 문자열이다. 병기는 거들 뿐이라 읽을 수 없으면
 * 아무것도 안 적는 편이 낫다.
 */
export function toKoreanMoney(won: number | null | undefined): string {
  if (won === null || won === undefined) return ''
  if (!Number.isFinite(won) || won <= 0) return ''

  const parts: string[] = []
  let rest = Math.floor(won)

  for (let group = 0; group < KOREAN_GROUPS.length && rest > 0; group += 1) {
    const chunk = rest % 10_000
    if (chunk > 0) parts.unshift(readKoreanGroup(chunk) + KOREAN_GROUPS[group])
    rest = Math.floor(rest / 10_000)
  }

  if (rest > 0) return ''

  return `${parts.join(' ')} 원`
}
