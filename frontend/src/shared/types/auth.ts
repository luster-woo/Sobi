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
   * 로컬 가입은 `PREENTREPRENEUR` 로 시작하지만(`AuthServiceImpl.signup`) 구글 신규
   * 가입은 role 을 넣지 않아 null 로 온다. **null 은 예비 창업자로 본다** — 직접
   * 비교하지 말고 `isPreOwner()` 를 쓸 것.
   */
  role: UserRole | null
}

export interface LoginResponse extends TokenResponse {
  expiresIn: number
  /** 항상 'Bearer' */
  tokenType: string
  user: SessionUser
  /**
   * 소셜 최초 가입이면 true. 온보딩으로 보낼지 판단한다.
   *
   * 기존 유저에게도 키는 온다 — 백엔드가 `issueTokens(user, null)` 로 넘겨 **null** 이
   * 실린다. 이메일 로그인 응답에는 아예 없다. 셋 다 falsy 라 `if (isNewUser)` 로 쓰면 된다.
   */
  isNewUser?: boolean | null
}

/** 로컬 계정을 소셜로 전환한 결과 */
export interface SocialLinkResponse {
  userId: number
  email: string
  provider: string
}

/**
 * 이메일 중복 확인 결과.
 *
 * ⚠️ `available` 이 아니라 `isDuplicate` 이고 **의미가 반대**다.
 *    백엔드가 `userRepository.existsByEmail()` 결과를 그대로 담는다 —
 *    `true` 면 **이미 쓰는 이메일**이라 가입할 수 없다.
 */
export interface EmailCheckResponse {
  isDuplicate: boolean
}

/** 인증번호 검증 결과. 실패는 200 이 아니라 400(AUTH_003 · AUTH_004)으로 온다 */
export interface EmailVerifyResponse {
  verified: boolean
}

export interface EmailSendRequest {
  email: string
}

export interface EmailVerifyRequest {
  email: string
  /** 숫자 6자리 **문자열**. 백엔드가 `^\d{6}$` 로 검증한다 */
  verificationCode: string
}

/**
 * 비밀번호 재설정용 인증번호 검증 결과.
 *
 * 가입용(`EmailVerifyResponse`)과 달리 `resetToken` 이 같이 온다. 이 토큰을 들고
 * `POST /auth/password/reset` 을 부른다 — **1회용이고 Redis TTL 이 있다.**
 */
export interface ResetVerifyResponse {
  verified: boolean
  resetToken: string
}

export interface PasswordResetRequest {
  /** `/auth/email/verify/reset` 응답으로 받은 값 */
  resetToken: string
  /** 8~20자. 백엔드가 @Size(min=8, max=20) 로 검증한다 */
  newPassword: string
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
