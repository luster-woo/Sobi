import { useQuery } from '@tanstack/react-query'

import { getSupportPrograms } from '@/features/support-program/api/supportPrograms'
import type { SupportProgramListParams } from '@/features/support-program/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/** 공고 목록은 자주 바뀌지 않는다. 필터를 오가며 다시 부르지 않게 1분 잡는다 */
const STALE_TIME_MS = 60 * 1000

/**
 * 지원사업 목록 조회.
 *
 * placeholderData 로 이전 페이지 데이터를 유지한다. 없으면 페이지를 넘길 때마다 표가
 * 비었다가 채워져서 스켈레톤이 매번 튀어나온다.
 */
export function useSupportPrograms(params: SupportProgramListParams) {
  return useQuery({
    queryKey: queryKeys.supportProgram.list(params),
    queryFn: () => getSupportPrograms(params),
    staleTime: STALE_TIME_MS,
    placeholderData: (previous) => previous,
  })
}
