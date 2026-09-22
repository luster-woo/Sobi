import { useQuery } from '@tanstack/react-query'

import { getSupportProgramExplanation } from '@/features/support-program/api/supportPrograms'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 설명은 서버가 한 번 만들어 저장해 두고 프로필이 바뀌기 전까지 같은 문장을 준다.
 * 상세(1분)보다 길게 잡아 모달을 여닫는 동안 다시 부르지 않게 한다.
 */
const STALE_TIME_MS = 30 * 60 * 1000

/**
 * 판정 사유 설명.
 *
 * 상세와 나눠서 부른다. 처음 만들 때 서버가 AI 로 2~3초를 쓰기 때문에, 합치면
 * 공고를 누르는 순간 화면 전체가 멈춘다. 상세를 먼저 그리고 이쪽은 늦게 채운다.
 *
 * **실패해도 다시 시도하지 않는다.** 이 요청은 실패하면 서버가 매번 AI 를
 * 다시 부르게 되고, 그것은 크레딧을 쓴다. 게다가 없어도 상세의 reason 으로
 * 화면이 온전히 뜨므로 재시도할 값이 없다.
 */
export function useSupportProgramExplanation(supportProgramId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.supportProgram.explanation(supportProgramId),
    queryFn: () => getSupportProgramExplanation(supportProgramId),
    enabled: enabled && Number.isInteger(supportProgramId) && supportProgramId > 0,
    staleTime: STALE_TIME_MS,
    retry: false,
  })
}
