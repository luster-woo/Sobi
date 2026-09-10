import { useQuery } from '@tanstack/react-query'

import { searchSupportPrograms } from '@/features/support-program/api/supportPrograms'
import type { SupportProgramSearchParams } from '@/features/support-program/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 자연어 검색 결과는 목록보다 짧게 잡는다. 같은 질의를 다시 던질 일이 드물고,
 * 자격 판정이 바뀌면 결과도 달라진다.
 */
const STALE_TIME_MS = 30 * 1000

/**
 * 지원사업 자연어 검색.
 *
 * 목록 조회(useSupportPrograms)와 쿼리 키를 나눈다. 엔드포인트도 메서드도 다른데
 * 같은 키를 쓰면 캐시가 섞여서 필터 결과가 검색 결과 자리에 나온다.
 */
export function useSupportProgramSearch(
  params: SupportProgramSearchParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.supportProgram.search(params),
    queryFn: () => searchSupportPrograms(params),
    enabled: options.enabled ?? true,
    staleTime: STALE_TIME_MS,
    placeholderData: (previous) => previous,
  })
}
