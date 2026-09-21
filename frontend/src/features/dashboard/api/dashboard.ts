import {
  type Dashboard,
  isOwnerResponse,
  type OwnerJudgement,
  toOwnerDashboard,
  toPreOwnerDashboard,
} from '@/features/dashboard/model/dashboard'
import type { DashboardResponse } from '@/features/dashboard/model/response'
import { getLoans } from '@/features/loan/api/loans'
import { getSupportPrograms } from '@/features/support-program/api/supportPrograms'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { SUPPORT_STATUS } from '@/shared/constants/productStatus'

/** 서버 상한. 기본 정렬이 마감 임박순이라 임박 건은 앞쪽에 모인다 */
const MAX_PAGE_SIZE = 100

/**
 * 판정 요약에 쓰는 네 건. 대시보드 응답이 아니라 목록 API 에서 따로 센다.
 *
 * 하나라도 실패하면 `null` 이다. 던지지 않는 이유는 이 넷이 **덤**이기 때문이다 —
 * 매출·상환·보험·추천 카드는 이미 손에 있는데, 판정 숫자를 못 셌다고 화면 전체를
 * 에러로 버리면 볼 수 있는 것까지 못 보게 된다.
 */
async function fetchJudgement(): Promise<OwnerJudgement | null> {
  try {
    const [loans, eligiblePrograms, ineligiblePrograms, unknownPrograms] = await Promise.all([
      getLoans({}),
      getSupportPrograms({ page: 0, size: MAX_PAGE_SIZE, judgement: SUPPORT_STATUS.ELIGIBLE }),
      getSupportPrograms({ page: 0, size: 1, judgement: SUPPORT_STATUS.INELIGIBLE }),
      getSupportPrograms({ page: 0, size: 1, judgement: SUPPORT_STATUS.UNKNOWN }),
    ])

    return {
      loans,
      eligiblePrograms,
      ineligibleProgramCount: ineligiblePrograms.page.totalElements,
      unknownProgramCount: unknownPrograms.page.totalElements,
    }
  } catch {
    return null
  }
}

export async function getDashboard(): Promise<Dashboard> {
  const { data } = await api.get<DashboardResponse>(endpoints.dashboard)
  if (!isOwnerResponse(data)) return { kind: 'preOwner', data: toPreOwnerDashboard(data) }

  return { kind: 'owner', data: toOwnerDashboard(data, await fetchJudgement()) }
}
