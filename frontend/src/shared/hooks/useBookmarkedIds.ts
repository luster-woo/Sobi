import { useQuery } from '@tanstack/react-query'

import { type BookmarkedIds, getBookmarkedIds } from '@/shared/api/bookmark'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

const EMPTY: BookmarkedIds = { loan: new Set(), support: new Set() }

/**
 * 담아둔 것의 id 집합.
 *
 * 대시보드 리본의 초기 상태를 그리는 데 쓴다 — `GET /dashboard` 응답에 북마크 여부가
 * 없어서 관심 목록으로 대조한다.
 *
 * 실패하면 빈 집합으로 둔다. 리본이 잠깐 비어 보이는 것뿐이고, 누르면 `useBookmarkToggle`
 * 이 서버 값으로 바로잡는다 — 이것 때문에 대시보드가 에러 화면이 되면 안 된다.
 *
 * 담기·빼기가 `queryKeys.bookmark.all` 을 무효화하므로 이 키도 같이 갱신된다.
 */
export function useBookmarkedIds(): BookmarkedIds {
  const status = useAuthStore((state) => state.status)

  const { data } = useQuery({
    queryKey: queryKeys.bookmark.ids,
    queryFn: getBookmarkedIds,
    enabled: status === 'authenticated',
    staleTime: 30 * 1000,
  })

  return data ?? EMPTY
}
