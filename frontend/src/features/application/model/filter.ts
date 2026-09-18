import { isSettled } from '@/features/application/model/statusLabel'
import type { ApplicationListItem } from '@/features/application/model/types'

export const APPLICATION_FILTER = {
  PREPARING: 'PREPARING',
  ONGOING: 'ONGOING',
  SETTLED: 'SETTLED',
  ALL: 'ALL',
} as const

export type ApplicationFilter = (typeof APPLICATION_FILTER)[keyof typeof APPLICATION_FILTER]

/**
 * 주소의 tab 값을 탭으로 바꾼다. 모르는 값이면 기본 탭이다.
 *
 * 탭을 주소에 두는 이유는 다른 화면이 특정 탭을 지목해야 해서다 — 자금 조합으로
 * 신청을 만들면 전부 준비 중이라, 기본 탭(진행 중)으로 보내면 방금 만든 것이
 * 하나도 안 보인다. 새로고침해도 남고 링크로 공유도 된다.
 */
export function toApplicationFilter(value: string | null): ApplicationFilter {
  const found = Object.values(APPLICATION_FILTER).find((filter) => filter === value)

  return found ?? APPLICATION_FILTER.ONGOING
}

/**
 * 탭이 거르는 규칙.
 *
 * 탭에 붙는 개수와 실제로 보이는 목록이 어긋나면 안 되니 한 함수로 둔다.
 * 컴포넌트가 아니라 여기 있는 이유는 fast refresh 규칙이다 — 컴포넌트 파일은
 * 컴포넌트만 내보내야 한다.
 *
 * 준비중을 진행 중에서 떼어낸 이유는 사용자가 할 일이 다르기 때문이다.
 *   준비중   서류를 올리고 최종 신청을 해야 한다 — 내가 움직여야 진행된다
 *   진행 중   기관이 심사 중이다 — 기다리는 것 말고 할 게 없다
 * 자금 조합으로 신청 건이 한 번에 여러 개 생기면 이 구분이 더 필요해진다.
 */
export function filterApplications(
  applications: ApplicationListItem[],
  filter: ApplicationFilter,
): ApplicationListItem[] {
  if (filter === 'ALL') return applications

  if (filter === 'PREPARING') {
    return applications.filter((item) => item.status === 'PREPARING')
  }

  /*
   * 준비중은 아직 끝나지도 않았지만 진행 중도 아니다. 두 탭 어디에도 안 들어간다 —
   * 그래서 '진행 중' 은 !isSettled 가 아니라 명시적으로 준비중을 뺀다.
   */
  if (filter === 'ONGOING') {
    return applications.filter((item) => item.status !== 'PREPARING' && !isSettled(item.status))
  }

  return applications.filter((item) => isSettled(item.status))
}
