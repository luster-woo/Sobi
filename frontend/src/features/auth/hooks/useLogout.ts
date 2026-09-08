import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { logout } from '@/features/auth/api/session'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/** 로그아웃. 서버 호출이 실패해도 세션은 정리한다 */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().clearSession()
      queryClient.clear()
      navigate(ROUTES.LOGIN, { replace: true })
    },
  })
}
