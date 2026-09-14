import { useMutation } from '@tanstack/react-query'

import { sendResetCode, verifyResetCode } from '@/features/auth/api/passwordReset'
import { checkEmailAvailable } from '@/features/auth/api/signup'
import type { EmailVerifyRequest } from '@/shared/types'

/**
 * 가입 여부 확인 후 인증번호 발송.
 *
 * 가입되지 않은 이메일이면 `false` 를 돌려주고 메일을 보내지 않는다. 화면에서 바로
 * "가입되지 않은 이메일" 을 띄울 수 있고, 없는 주소로 메일이 나가는 것도 막는다.
 *
 * ⚠️ 트레이드오프를 알고 택했다. 백엔드는 검증 단계에서 계정 존재 여부를 숨기도록
 *    설계했는데(user enumeration 방어), `/auth/email/check` 가 가입 화면에서 이미
 *    공개돼 있어 여기서만 숨겨도 실효가 없다. 그 상태에서 UX 만 나빠지는 것보다
 *    바로 알려주는 쪽을 골랐다. 근본 해결은 해당 API 에 rate limit 을 거는 것 — ADR 참고.
 */
export function useSendResetCode() {
  return useMutation({
    mutationFn: async (email: string) => {
      const available = await checkEmailAvailable(email)
      // available 은 "가입 가능" 이다. 재설정은 반대로 가입돼 있어야 한다
      if (available) return false

      await sendResetCode(email)
      return true
    },
  })
}

/** 재설정용 인증번호 검증. 성공하면 resetToken 을 돌려준다 */
export function useVerifyResetCode() {
  return useMutation({
    mutationFn: (body: EmailVerifyRequest) => verifyResetCode(body),
  })
}
