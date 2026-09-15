import { isSettled } from '@/features/application/model/statusLabel'
import type { ApplicationListItem } from '@/features/application/model/types'

export const APPLICATION_FILTER = {
  ONGOING: 'ONGOING',
  SETTLED: 'SETTLED',
  ALL: 'ALL',
} as const

export type ApplicationFilter = (typeof APPLICATION_FILTER)[keyof typeof APPLICATION_FILTER]

/**
 * 탭이 거르는 규칙.
 *
 * 탭에 붙는 개수와 실제로 보이는 목록이 어긋나면 안 되니 한 함수로 둔다.
 * 컴포넌트가 아니라 여기 있는 이유는 fast refresh 규칙이다 — 컴포넌트 파일은
 * 컴포넌트만 내보내야 한다.
 */
export function filterApplications(
  applications: ApplicationListItem[],
  filter: ApplicationFilter,
): ApplicationListItem[] {
  if (filter === 'ALL') return applications

  const settled = filter === 'SETTLED'
  return applications.filter((item) => isSettled(item.status) === settled)
}
