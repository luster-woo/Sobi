import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMyPage } from '@/features/mypage/api/mypage'
import { toggleNotification } from '@/features/mypage/api/user'
import type { MyPageData } from '@/features/mypage/model/types'
import { getErrorMessage } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'

/**
 * 내 정보. 마이페이지와 연동 계좌 화면이 같이 쓴다.
 *
 * 짧게 잡는다. 업체 정보나 알림 설정을 고치고 돌아오는 흐름이 흔한데 길게 잡으면
 * 방금 바꾼 값이 안 보인다.
 */
const STALE_TIME_MS = 30 * 1000

export function useMyPage() {
  const status = useAuthStore((state) => state.status)

  return useQuery({
    queryKey: queryKeys.user.mypage,
    queryFn: getMyPage,
    enabled: status === 'authenticated',
    staleTime: STALE_TIME_MS,
  })
}

/**
 * 새 공고 알림 토글.
 *
 * 낙관적으로 뒤집는다. 스위치는 누른 즉시 움직여야 하고, 왕복을 기다리면 눌렀는데
 * 안 움직이는 구간이 생겨 사용자가 한 번 더 누른다 — 서버가 값을 뒤집는 방식이라
 * 두 번 누르면 원래대로 돌아온다.
 *
 * 응답이 오면 서버가 준 값으로 덮는다. 프론트가 계산한 값과 어긋나면 서버가 맞다.
 */
export function useToggleNotification() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  const setNotification = (notification: boolean) => {
    queryClient.setQueryData<MyPageData>(queryKeys.user.mypage, (old) =>
      old ? { ...old, notification } : old,
    )
  }

  return useMutation({
    mutationFn: toggleNotification,

    onMutate: async () => {
      // 진행 중인 조회가 끝나면서 방금 뒤집은 값을 되돌리는 것을 막는다
      await queryClient.cancelQueries({ queryKey: queryKeys.user.mypage })

      const previous = queryClient.getQueryData<MyPageData>(queryKeys.user.mypage)
      if (previous) setNotification(!previous.notification)

      return { previous }
    },

    onSuccess: (notification) => setNotification(notification),

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.user.mypage, context.previous)
      }

      showToast(getErrorMessage(error, { 401: '로그인이 필요해요.' }), 'danger')
    },
  })
}
