import { toDashboard } from '@/features/dashboard/model/dashboard'
import type { DashboardResponse } from '@/features/dashboard/model/response'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

export async function getDashboard() {
  const { data } = await api.get<DashboardResponse>(endpoints.dashboard)
  return toDashboard(data)
}
