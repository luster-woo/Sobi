import { useState } from 'react'

/**
 * 즐겨찾기 토글을 화면 안에서만 기억한다.
 *
 * ⚠️ 임시다. 즐겨찾기 API(`/bookmark`)가 아직 없어서 새로고침하면 전부 초기값으로
 *    돌아간다. 서버가 붙으면 이 훅을 지우고 useMutation + queryClient.invalidateQueries
 *    로 바꾼다 — 낙관적 갱신이 필요하면 onMutate 에서 캐시를 직접 손대는 쪽이 맞다.
 *
 * 서버 값을 그대로 읽지 않고 별도 Set 을 두는 이유: 목 데이터는 상수라 눌러도 값이
 * 바뀌지 않는다. 눌리는 느낌이 없으면 버튼이 고장난 것으로 보인다.
 */
export function useBookmarkDraft(initialIds: number[]) {
  // 초기화 함수는 첫 렌더에만 돈다. 목이 바뀌지 않으므로 동기화는 필요 없다
  const [ids, setIds] = useState(() => new Set(initialIds))

  const toggle = (id: number) => {
    setIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return { isBookmarked: (id: number) => ids.has(id), toggle }
}
