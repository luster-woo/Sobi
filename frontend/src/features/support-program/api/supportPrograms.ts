import type {
  SupportProgramListData,
  SupportProgramListParams,
} from '@/features/support-program/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'

/**
 * 지원사업 목록 조회.
 * 봉투를 여기서 벗긴다. client.ts 인터셉터로 옮기기로 정해지면 이 함수만 고치면 된다.
 */
export async function getSupportPrograms(params: SupportProgramListParams) {
  const { data } = await api.get<ApiResponse<SupportProgramListData>>(
    endpoints.supportProgram.list,
    { params },
  )
  return data.data
}
