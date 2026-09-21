import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getBookmarks } from '@/features/mypage/api/bookmarks'
import type { FavoriteItem } from '@/features/mypage/model/types'
import { removeBookmark } from '@/shared/api/bookmark'
import { getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import type { BookmarkTarget } from '@/shared/types'

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
 * 예비창업자도 부른다. 관심 목록은 업체 등록 전에도 쓰는 기능이라 role 로 막으면
 * 담아둔 것을 영영 못 본다. 백엔드가 `business == null` 을 분기하므로
 * (`BookmarkServiceImpl.getBookmarks`) 판정은 전부 UNKNOWN·INELIGIBLE 로 온다.
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

interface RemoveFavoriteVariables {
  programId: number
  type: BookmarkTarget
}

/** 관심 목록 캐시에서 한 줄을 찾는 키. programId 만으로는 대출 21번과 지원사업 21번이 겹친다 */
function isSame(item: FavoriteItem, { programId, type }: RemoveFavoriteVariables) {
  return item.id === programId && item.kind === type
}

/**
 * 관심 목록 화면에서 한 줄 빼기.
 *
 * `useBookmarkToggle` 과 달리 낙관적으로 지운다. 여기서는 누른 줄이 **사라져야**
 * 하는데, 응답을 기다렸다가 지우면 리본을 눌러도 줄이 그대로 남아 있는 구간이 생긴다.
 * 그 사이 한 번 더 누르면 같은 것을 두 번 빼서 404 가 난다.
 *
 * 캐시 모양이 `FavoriteItem[]` 하나뿐이라 되돌리기도 스냅샷 한 벌로 끝난다 —
 * 상세 모달 쪽 토글을 낙관적으로 만들지 않은 이유(캐시 네 군데)가 여기엔 없다.
 *
 * 대출·지원사업 목록의 아이콘과 대시보드 리본(`bookmark.ids`)이 같이 낡으므로 끝나면
 * 그쪽도 무효화한다. `bookmark.all` 로 한 번에 잡지 않는 이유는 그 접두사가 관심 목록
 * 자신(`bookmark.me`)까지 포함해서다 — 방금 낙관적으로 지운 줄이 refetch 사이에 잠깐
 * 돌아온다. 관심 목록은 실패했을 때만 서버 값을 다시 받는다.
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (variables: RemoveFavoriteVariables) => removeBookmark(variables),

    onMutate: async (variables) => {
      // 진행 중인 조회가 끝나면서 방금 지운 줄을 되살리는 것을 막는다
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmark.me })

      const previous = queryClient.getQueryData<FavoriteItem[]>(queryKeys.bookmark.me)

      queryClient.setQueryData<FavoriteItem[]>(queryKeys.bookmark.me, (old) =>
        (old ?? []).filter((item) => !isSame(item, variables)),
      )

      return { previous }
    },

    onError: (error, _variables, context) => {
      // 지운 줄을 되돌린다. 스냅샷이 없으면(캐시가 비어 있었으면) 아래 무효화가 받는다
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.bookmark.me, context.previous)
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.me })

      /*
       * 404 BOOKMARK_005 는 이미 빠져 있다는 뜻이다. 사용자가 할 일이 없으므로
       * '실패' 라고 하지 않는다 — 줄은 되돌아왔다가 무효화로 다시 사라진다.
       */
      const message =
        getErrorCode(error) === 'BOOKMARK_005'
          ? '이미 관심 목록에서 빠져 있어요.'
          : getErrorMessage(error, { 401: '로그인이 필요해요.' })

      showToast(message, 'danger')
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.ids })
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportProgram.all })
    },
  })
}
