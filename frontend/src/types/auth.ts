import type { AuthProvider, User, UserRole } from '@/types/user'

/**
 * 인증 요청·응답 DTO
 *
 * 토큰 정책 (S15P21D101-120/127 결정 사항)
 *   accessToken  → 응답 바디로 받아 메모리(Zustand)에만 보관. 새로고침 시 사라집니다.
 *   refreshToken → 서버가 httpOnly + Secure 쿠키로 내려줍니다. FE 는 값을 볼 수 없습니다.
 *
 * 따라서 로그인/재발급 응답에는 refreshToken 이 포함되지 않습니다.
 * MSW 핸들러(mocks/handlers/auth.ts)는 아직 옛 형태를 반환하므로 함께 맞춰야 합니다.
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  name: string
  role: UserRole
  phoneNumber?: string
}

export interface TokenResponse {
  accessToken: string
  /** 액세스 토큰 만료까지 남은 초 */
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
  /** 소셜 제공자에서 받은 인가 코드 */
  code: string
}
