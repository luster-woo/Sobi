import type {
  SupportProgramDetail,
  SupportProgramListData,
  SupportProgramListParams,
  SupportProgramSearchParams,
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

/**
 * 지원사업 자연어 검색.
 *
 * 목록 조회와 엔드포인트도 메서드도 다르다. page·size 만 쿼리로 붙고 질의는 본문에 담는다.
 * 응답 형태는 목록과 같아서 SupportProgramListData 를 그대로 쓴다.
 */
export async function searchSupportPrograms({ page, size, query }: SupportProgramSearchParams) {
  const { data } = await api.post<ApiResponse<SupportProgramListData>>(
    endpoints.supportProgram.search,
    { query },
    { params: { page, size } },
  )
  return data.data
}

/** 지원사업 상세. 모달에서 쓴다 */
export async function getSupportProgramDetail(supportProgramId: number) {
  const { data } = await api.get<ApiResponse<SupportProgramDetail>>(
    endpoints.supportProgram.detail(supportProgramId),
  )
  return data.data
}
