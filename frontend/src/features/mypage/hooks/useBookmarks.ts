import { useQuery } from '@tanstack/react-query'

import { getBookmarks } from '@/features/mypage/api/bookmarks'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 짧게 잡는다. 대출·지원사업 목록에서 북마크를 누르고 관심 목록으로 넘어오는 흐름이
 * 흔한데, 길게 잡으면 방금 담은 것이 안 보인다. 담기·빼기(367)가 붙으면 무효화가
 * 받쳐주지만 그 전까지는 이쪽이 유일한 갱신 수단이다.
 */
const STALE_TIME_MS = 30 * 1000

/**
 * 내 관심 목록.
 *
 * 로그인 상태에서만 부른다. 서버가 `@AuthenticationPrincipal` 로 userId 를 받아서
 * 비로그인이면 401 이다.
 *
 * ⚠️ 예비창업자는 500 이 날 수 있다. `BookmarkServiceImpl` 이 신청 이력이 없는 항목의
 *    상태를 판정할 때 `businessReporitory.findByUserId(userId)` 결과를 null 검사 없이
 *    바로 쓰는데, 업체를 등록하지 않은 계정은 여기서 null 이다. 담아둔 것이 하나라도
 *    있으면 터진다 — 백엔드 수정이 필요하고, 그 전까지는 에러 화면으로 떨어진다.
 *    (useInsurances 처럼 role 로 막지 않는 이유: 관심 목록은 예비창업자도 쓰는 기능이라
 *     아예 안 부르면 담아둔 것을 영영 못 본다. 빈 화면보다 재시도할 수 있는 에러가 낫다)
 */
export function useBookmarks() {
  const status = useAuthStore((s) => s.status)

  return useQuery({
    queryKey: queryKeys.bookmark.me,
    queryFn: getBookmarks,
    enabled: status === 'authenticated',
    staleTime: STALE_TIME_MS,
  })
}
