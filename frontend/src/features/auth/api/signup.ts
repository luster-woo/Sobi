import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type {
  EmailCheckResponse,
  EmailVerifyRequest,
  EmailVerifyResponse,
  SignUpRequest,
} from '@/shared/types'

/**
 * 이메일 중복 확인.
 *
 * ⚠️ 응답이 `{ isDuplicate }` 이고 **true 가 "쓸 수 없음"** 이다.
 *    화면에서 쓰기 좋게 여기서 뒤집어 "가입 가능한가" 로 돌려준다.
 */
export async function checkEmailAvailable(email: string) {
  const { data } = await api.get<EmailCheckResponse>(endpoints.auth.emailCheck, {
    params: { email },
  })
  return !data.isDuplicate
}

/** 인증번호 발송. 1분 안에 다시 부르면 429 AUTH_002 */
export async function sendEmailCode(email: string) {
  await api.post(endpoints.auth.emailSend, { email })
}

/**
 * 가입용 인증번호 검증.
 *
 * 성공하면 서버가 "이 이메일은 인증됨" 을 따로 저장하고, `signup` 이 그걸 확인한다.
 * 실패는 200 이 아니라 **400** 이다 — AUTH_003(만료) · AUTH_004(불일치).
 */
export async function verifyEmailCode(body: EmailVerifyRequest) {
  const { data } = await api.post<EmailVerifyResponse>(endpoints.auth.emailVerify, body)
  return data.verified
}

/**
 * 회원가입.
 *
 * 응답에 토큰이 없다(`data: null`). 가입 직후 자동 로그인이 안 되므로 로그인 화면으로 보낸다.
 * 인증번호 검증을 건너뛰면 400 AUTH_006 이다.
 */
export async function signUp(body: SignUpRequest) {
  await api.post(endpoints.auth.signUp, body)
}
