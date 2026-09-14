import { useMutation } from '@tanstack/react-query'

import { checkEmailAvailable, sendEmailCode, signUp, verifyEmailCode } from '@/features/auth/api/signup'
import type { EmailVerifyRequest, SignUpRequest } from '@/shared/types'

/**
 * 이메일 중복 확인 후 인증번호 발송.
 *
 * 둘을 한 mutation 으로 묶는다. 화면에서 보면 '코드 발송' 버튼 하나의 동작이고,
 * 중복이면 발송까지 갈 필요가 없어 순서가 고정이다.
 *
 * 중복이면 `false` 를 돌려준다 — 에러가 아니라 정상 응답이라서다.
 */
export function useSendEmailCode() {
  return useMutation({
    mutationFn: async (email: string) => {
      const available = await checkEmailAvailable(email)
      if (!available) return false

      await sendEmailCode(email)
      return true
    },
  })
}

/** 인증번호 검증. 만료·불일치는 400 으로 오므로 onError 에서 받는다 */
export function useVerifyEmailCode() {
  return useMutation({
    mutationFn: (body: EmailVerifyRequest) => verifyEmailCode(body),
  })
}

/** 회원가입. 응답에 토큰이 없어 자동 로그인은 안 된다 */
export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpRequest) => signUp(body),
  })
}
