import {
  type Dashboard,
  isOwnerResponse,
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

export async function getDashboard(): Promise<Dashboard> {
  const { data } = await api.get<DashboardResponse>(endpoints.dashboard)
  if (!isOwnerResponse(data)) return { kind: 'preOwner', data: toPreOwnerDashboard(data) }

  const [loans, eligiblePrograms, ineligiblePrograms, unknownPrograms] = await Promise.all([
    getLoans({}),
    getSupportPrograms({ page: 0, size: MAX_PAGE_SIZE, judgement: SUPPORT_STATUS.ELIGIBLE }),
    getSupportPrograms({ page: 0, size: 1, judgement: SUPPORT_STATUS.INELIGIBLE }),
    getSupportPrograms({ page: 0, size: 1, judgement: SUPPORT_STATUS.UNKNOWN }),
  ])

  return {
    kind: 'owner',
    data: toOwnerDashboard(data, {
      loans,
      eligiblePrograms,
      ineligibleProgramCount: ineligiblePrograms.page.totalElements,
      unknownProgramCount: unknownPrograms.page.totalElements,
    }),
  }
}
