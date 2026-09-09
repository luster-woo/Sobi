import type { AuthProvider, User } from '@/shared/types/user'

/**
 * 인증 요청·응답.
 *
 * 토큰 정책: accessToken 은 응답 바디로 받아 메모리(`shared/lib/store/useAuthStore.ts`)에만 두고,
 * refreshToken 은 서버가 httpOnly + Secure 쿠키로 관리한다. 프론트는 refreshToken
 * 값을 볼 수 없으므로 응답 타입에도 없다.
 *
 * ⚠️ 현재 MSW 핸들러(`mocks/handlers/auth.ts`)는 `{ accessToken, refreshToken }` 을
 *    반환한다. 이 정책에 맞춰 핸들러도 같이 고쳐야 한다.
 */

export interface LoginRequest {
  email: string
  password: string
}

/**
 * 명세가 받는 필드는 셋뿐이다. `role` 은 가입 시점에 정해지지 않고
 * `POST /business` 로 업체를 등록하면 ENTREPRENEUR 가 된다.
 */
export interface SignUpRequest {
  email: string
  password: string
  name: string
}

export interface TokenResponse {
  accessToken: string
  /** 만료까지 남은 초. 선제 재발급 타이머에 쓴다 */
  expiresIn: number
}

export interface LoginResponse extends TokenResponse {
  user: User
}

export interface EmailCheckResponse {
  available: boolean
}

export interface OAuthLoginRequest {
  provider: AuthProvider
  /** 소셜 제공자 리다이렉트로 받은 인가 코드 */
  code: string
}
