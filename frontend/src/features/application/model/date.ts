/**
 * 신청 날짜 표기.
 *
 * 서버가 'YYYY-MM-DDTHH:mm:ss' 로 준다. shared 의 formatIsoDate 는 금융망의
 * 'YYYYMMDD' 를 다루는 함수라 이쪽에는 맞지 않는다.
 *
 * Date 로 파싱하지 않는다. 시간대가 붙지 않은 문자열이라 브라우저마다 로컬로 읽을지
 * UTC 로 읽을지 갈리고, 자정 근처에서 날짜가 하루 어긋난다. 앞 10자만 쓰면 그럴 일이 없다.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

interface Parts {
  year: string
  month: number
  day: number
}

function parse(value: string): Parts | null {
  const matched = ISO_DATE.exec(value)
  if (!matched) return null

  return { year: matched[1], month: Number(matched[2]), day: Number(matched[3]) }
}

/** '2026-09-12T10:01:00' → '2026. 9. 12'. 못 읽으면 원본을 그대로 돌려준다 */
export function formatApplicationDate(value: string): string {
  const parts = parse(value)
  if (!parts) return value

  return `${parts.year}. ${parts.month}. ${parts.day}`
}

/**
 * '2026-09-12T10:01:00' → '9. 12'
 *
 * 스텝퍼처럼 자리가 좁고 같은 해의 날짜만 나오는 곳에 쓴다.
 */
export function formatApplicationDateShort(value: string): string {
  const parts = parse(value)
  if (!parts) return value

  return `${parts.month}. ${parts.day}`
}
