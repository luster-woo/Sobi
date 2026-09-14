import type { UserRole } from '@/shared/types/user'

/**
 * 인증 요청·응답.
 *
 * 토큰 정책: accessToken 은 응답 바디로 받아 메모리(`shared/lib/store/useAuthStore.ts`)에만 두고,
 * refreshToken 은 서버가 httpOnly + Secure 쿠키로 관리한다. 프론트는 refreshToken
 * 값을 볼 수 없으므로 응답 타입에도 없다.
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
  /**
   * 만료까지 남은 초.
   *
   * ⚠️ `/auth/refresh` 응답에는 **없다**. 로그인 응답에만 온다 — 그래서 optional 이고,
   *    선제 재발급 타이머는 못 만든다. 재발급은 401 을 받고 나서만 돈다 (BE-05).
   */
  expiresIn?: number
}

/**
 * 로그인 응답에 실려오는 사용자 정보. **네 필드뿐이다.**
 *
 * `shared/types/user.ts` 의 `User`(테이블 전체)와 다르다. 신용등급·가입 경로·알림 설정
 * 같은 나머지는 `GET /user/me` 가 주기로 되어 있는데 백엔드에 아직 없다.
 *
 * 화면이 세션에서 실제로 읽는 값은 `role` 과 `name` 뿐이라 이 네 개로 충분하다.
 * 키가 `id` 가 아니라 **`userId`** 다.
 */
export interface SessionUser {
  userId: number
  email: string
  name: string
  /**
   * ⚠️ **null 일 수 있다.** 백엔드 `LoginResponse.UserInfo.from()` 이
   * `user.getRole() != null ? ... : null` 로 넣는다.
   *
   * 가입 시점에는 role 이 정해지지 않고 `POST /business` 로 업체를 등록해야
   * ENTREPRENEUR 가 된다. 즉 **가입 직후 로그인하면 null 이다.**
   * 대시보드·사이드바가 role 로 갈라지므로 null 을 '아직 안 정해짐' 으로 다뤄야 한다.
   */
  role: UserRole | null
}

export interface LoginResponse extends TokenResponse {
  expiresIn: number
  /** 항상 'Bearer' */
  tokenType: string
  user: SessionUser
  /** 소셜 최초 가입일 때만 온다. 온보딩으로 보낼지 판단한다 */
  isNewUser?: boolean
}

/** 로컬 계정을 소셜로 전환한 결과 */
export interface SocialLinkResponse {
  userId: number
  email: string
  provider: string
}

export interface EmailCheckResponse {
  available: boolean
}

export interface OAuthLoginRequest {
  /** 소셜 제공자 리다이렉트로 받은 인가 코드 */
  code: string
  /**
   * 인가 요청에 쓴 리디렉션 URI.
   *
   * 서버가 구글에 code 를 교환할 때 **같은 값**을 보내야 해서 함께 넘긴다.
   * 다르면 구글이 교환을 거부한다.
   */
  redirectUri: string
}
