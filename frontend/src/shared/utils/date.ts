/**
 * 날짜 계산. 표시용 변환은 `formatters.ts` 에 있다 — 이쪽은 값을 만드는 쪽이다.
 */

/**
 * 어제 날짜 'YYYY-MM-DD'.
 *
 * 생년월일 입력칸의 상한이다. 백엔드가 `@Past` 라 오늘을 보내면 400 이고,
 * `DatePicker` 의 `max` 기본값은 오늘이라 그냥 두면 달력에서 오늘을 고를 수 있다.
 *
 * ⚠️ `toISOString()` 을 쓰지 않는다. UTC 로 바꾸면서 한국 시간 오전 9시 이전에는
 *    하루가 밀린다 — 날짜만 필요한 자리라 로컬 기준으로 직접 만든다.
 */
export function yesterdayIso(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}
