import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { EmailVerifyRequest, PasswordResetRequest, ResetVerifyResponse } from '@/shared/types'

/**
 * 비밀번호 재설정 흐름: 인증번호 발송 → 검증(resetToken 수령) → 재설정.
 * 발송은 가입과 같은 엔드포인트(`/auth/email/send`)를 쓴다.
 */

/** 인증번호 발송. 가입과 같은 엔드포인트이고 1분 쿨다운이 걸린다 */
export async function sendResetCode(email: string) {
  await api.post(endpoints.auth.emailSend, { email })
}

/**
 * 재설정용 인증번호 검증. 성공하면 `resetToken` 을 준다.
 *
 *   - 없는 계정·탈퇴 계정도 **AUTH_003** — 인증번호 불일치와 구분되지 않는다
 *   - 소셜 계정은 **AUTH_018** — 비밀번호가 없어 재설정할 것이 없다
 */
export async function verifyResetCode(body: EmailVerifyRequest) {
  const { data } = await api.post<ResetVerifyResponse>(endpoints.auth.emailVerifyReset, body)
  return data.resetToken
}

/**
 * 비밀번호 재설정. 비로그인 상태에서 부른다 — 인증은 resetToken 이 대신한다.
 *
 * ⚠️ 서버가 성공 시 **기존 세션을 전부 끊는다**(`refreshTokenRepository.delete`).
 *    다른 기기에 로그인돼 있었다면 거기서도 로그아웃된다. 비밀번호가 샜을 때
 *    쓰는 기능이라 맞는 동작이고, 화면에서도 다시 로그인하라고 안내한다.
 *
 * resetToken 은 1회용이라 실패해도 재시도할 수 없다. AUTH_011 이면 인증부터 다시 한다.
 */
export async function resetPassword(body: PasswordResetRequest) {
  await api.post(endpoints.auth.passwordReset, body)
}
