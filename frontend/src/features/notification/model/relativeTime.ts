import type { ISODateTime } from '@/shared/types'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * '10분 전' · '5시간 전' · '3일 전'. 일주일이 넘으면 날짜로 보여준다.
 *
 * 스케줄러가 매일 같은 시각에 알림을 만들어서, 같은 배치의 항목들은 시간이 똑같이
 * 표시된다. 틀린 게 아니라 실제로 같은 시각에 온 것이다.
 */
export function formatRelativeTime(iso: ISODateTime, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(iso).getTime()

  if (elapsed < MINUTE) return '방금'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`

  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}.${month}.${day}`
}
