import { useMutation, useQueryClient } from '@tanstack/react-query'

import { addBookmark, type BookmarkVariables, removeBookmark } from '@/shared/api/bookmark'
import { getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { useUiStore } from '@/shared/lib/store/useUiStore'

/** 누른 뒤 되어야 할 상태. 지금 담겨 있으면 false 를 보내 뺀다 */
export interface BookmarkToggleVariables extends BookmarkVariables {
  next: boolean
}

/**
 * 담기·빼기 실패 안내.
 *
 * 둘 다 '이미 그 상태' 라는 뜻이라 사용자가 할 일은 없다. 손에 든 화면이 낡았을 뿐이고
 * onSettled 의 무효화가 바로잡는다 — 그래서 '다시 시도해주세요' 라고 하지 않는다.
 */
const CODE_MESSAGE: Record<string, string> = {
  BOOKMARK_003: '이미 관심 목록에 담겨 있어요.',
  BOOKMARK_005: '이미 관심 목록에서 빠져 있어요.',
}

/**
 * 관심 목록 담기·빼기.
 *
 * 세 화면이 같이 쓴다 — 대출 상세 모달 · 지원사업 상세 모달 · 관심 목록.
 * 그래서 feature 가 아니라 shared 에 있다.
 *
 * **낙관적 갱신을 하지 않는다.** 이 토글 하나가 캐시 네 군데를 건드린다 — 관심 목록,
 * 대출 목록·상세, 지원사업 목록·상세. 모양이 다 달라서 onMutate 에서 전부 손대면
 * 되돌리기까지 네 벌을 써야 하고, 한 군데만 빠뜨려도 화면마다 다른 상태가 보인다.
 * 대신 버튼은 `isPending` 동안 `variables.next` 를 보여주면 눌린 느낌이 유지된다.
 * (관심 목록의 '빼기' 는 줄이 사라져야 해서 그쪽만 따로 낙관적 갱신을 한다 —
 *  `useRemoveFavorite`)
 *
 * 무효화가 셋인 이유: 담기·빼기는 관심 목록만 바꾸는 게 아니다. 대출·지원사업 목록의
 * 북마크 아이콘과 `bookmarked` 필터 결과, 상세의 리본까지 같이 낡는다.
 */
export function useBookmarkToggle() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: ({ next, ...variables }: BookmarkToggleVariables) =>
      next ? addBookmark(variables) : removeBookmark(variables),

    onError: (error) => {
      const code = getErrorCode(error)
      showToast(
        (code && CODE_MESSAGE[code]) || getErrorMessage(error, { 401: '로그인이 필요해요.' }),
        'danger',
      )
    },

    /*
     * 실패해도 다시 받아온다. 409·404 는 손에 든 값이 서버와 어긋났다는 뜻이라
     * 여기서 갱신하지 않으면 사용자가 같은 오류를 계속 만난다.
     */
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmark.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.loan.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportProgram.all })
    },
  })
}
