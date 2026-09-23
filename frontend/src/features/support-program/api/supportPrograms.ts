import type {
  SupportProgramDetail,
  SupportProgramExplanation,
  SupportProgramListData,
  SupportProgramListParams,
  SupportProgramSearchParams,
} from '@/features/support-program/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/** 지원사업 목록 조회. 봉투는 `client.ts` 인터셉터가 벗긴다 */
export async function getSupportPrograms(params: SupportProgramListParams) {
  const { data } = await api.get<SupportProgramListData>(endpoints.supportProgram.list, { params })
  return data
}

/**
 * 지원사업 자연어 검색.
 *
 * 목록 조회와 엔드포인트도 메서드도 다르다. page·size 만 쿼리로 붙고 질의는 본문에 담는다.
 * 응답 형태는 목록과 같아서 SupportProgramListData 를 그대로 쓴다.
 */
export async function searchSupportPrograms({ page, size, query }: SupportProgramSearchParams) {
  const { data } = await api.post<SupportProgramListData>(
    endpoints.supportProgram.search,
    { query },
    { params: { page, size } },
  )
  return data
}

/** 지원사업 상세. 모달에서 쓴다 */
export async function getSupportProgramDetail(supportProgramId: number) {
  const { data } = await api.get<SupportProgramDetail>(
    endpoints.supportProgram.detail(supportProgramId),
  )
  return data
}

/**
 * 판정 사유 설명. 상세와 따로 부른다.
 *
 * 서버가 처음 한 번만 AI 로 만들고 저장하므로, 같은 공고를 다시 열면 즉시 온다.
 * `explanation` 이 null 인 경우가 정상적으로 있다 — 마이데이터 연동 전이거나
 * 예비창업자라 판정 자체가 없을 때다. 그때는 상세의 `reason` 을 그대로 쓴다.
 */
export async function getSupportProgramExplanation(supportProgramId: number) {
  const { data } = await api.get<SupportProgramExplanation>(
    endpoints.supportProgram.explanation(supportProgramId),
  )
  return data
}
