import { useMutation } from '@tanstack/react-query'

import { type ProfileSetupRequest, updateProfile } from '@/features/auth/api/profile'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 이름·생년월일을 저장하고 세션에 반영한다.
 *
 * 스토어를 같이 갱신하는 이유: 생년월일이 비었는지로 이 창을 띄울지 정하고, 이름은
 * 상단바·마이페이지가 바로 읽는다. 저장만 하고 세션을 그대로 두면 방금 고친 이름이
 * 화면에서는 구글 이름 그대로 보인다.
 *
 * ⚠️ 세션에 `user` 가 없으면 갱신을 건너뛴다. 이 흐름은 로그인 직후에만 도는데,
 *    그 사이 토큰이 날아갔다면 세션을 되살리는 자리가 아니다.
 */
export function useProfileSetup() {
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (body: ProfileSetupRequest) => updateProfile(body),
    onSuccess: (saved) => {
      const { user } = useAuthStore.getState()
      if (user) setUser({ ...user, name: saved.name, birthDate: saved.birthDate })
    },
  })
}
