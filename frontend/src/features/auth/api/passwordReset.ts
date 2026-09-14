import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { EmailVerifyRequest, ResetVerifyResponse } from '@/shared/types'

/**
 * 비밀번호 재설정 흐름.
 *
 *   인증번호 발송 → 검증(resetToken 수령) → 재설정
 *
 * 발송은 가입과 같은 엔드포인트(`/auth/email/send`)를 쓴다. 검증만 다르다 —
 * 재설정용은 계정이 실제로 있는지, 소셜 계정이 아닌지까지 본다.
 */

/** 인증번호 발송. 가입과 같은 엔드포인트이고 1분 쿨다운이 걸린다 */
export async function sendResetCode(email: string) {
  await api.post(endpoints.auth.emailSend, { email })
}

/**
 * 재설정용 인증번호 검증. 성공하면 `resetToken` 을 준다.
 *
 * 가입용과 다른 점이 둘 있다.
 *   - 없는 계정·탈퇴 계정도 **AUTH_003** 으로 온다. 계정 존재 여부를 숨기려는 것이라
 *     화면에서도 '인증번호가 틀렸다' 와 구분하지 않는다
 *   - 소셜 계정은 **AUTH_018** 이다. 비밀번호가 없어 재설정할 것이 없다
 */
export async function verifyResetCode(body: EmailVerifyRequest) {
  const { data } = await api.post<ResetVerifyResponse>(endpoints.auth.emailVerifyReset, body)
  return data.resetToken
}
