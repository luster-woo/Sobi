import type { ISODate } from '@/shared/types/common'
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
 * 백엔드 `SignupRequest` 와 1:1. `role` 은 가입 시점에 정해지지 않고
 * `POST /business` 로 업체를 등록하면 ENTREPRENEUR 가 된다.
 */
export interface SignUpRequest {
  email: string
  password: string
  name: string
  /**
   * 생년월일 'YYYY-MM-DD'. 백엔드 `SignupRequest.birthDate` 는 `@NotNull @Past` 라
   * **필수이고 오늘은 안 된다** — 오늘을 보내면 400 COMMON_001 이다.
   *
   * ⚠️ `users.birth_date` 컬럼 자체는 nullable 이다. 소셜 가입은 구글이 생일을 안 줘서
   *    비워 두기로 했고(V23 마이그레이션 주석), 로컬 가입만 필수다.
   */
  birthDate: ISODate
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
 * 로그인 응답에 실려오는 사용자 정보. 백엔드 `LoginResponse.UserInfo` 와 1:1.
 *
 * `shared/types/user.ts` 의 `User`(테이블 전체)와 다르다. 가입 경로는 `GET /user/me` 가
 * 같이 주지만 이 타입은 안 담는다 — 필요한 화면(마이페이지)이 `GET /user/mypage` 를
 * 따로 보기 때문이다. 신용등급·알림 설정도 그쪽에 있다.
 *
 * 키가 `id` 가 아니라 **`userId`** 다.
 */
export interface SessionUser {
  userId: number
  email: string
  name: string
  /**
   * 생년월일 'YYYY-MM-DD'.
   *
   * ⚠️ **구글 가입자는 null 이다.** 구글이 생일을 주지 않아 가입 시점에 채울 수 없다
   *    (V23 마이그레이션 주석: '소셜 가입 시 null, 온보딩에서 입력'). 로그인 직후
   *    `PATCH /user/profile` 로 받아 채운다 — `ProfileSetupModal` 참고.
   *
   *    로컬 가입은 `SignupRequest.birthDate` 가 `@NotNull` 이라 항상 값이 있다.
   */
  birthDate: ISODate | null
  /**
   * ⚠️ 타입상 null 이 가능하다. 백엔드 `LoginResponse.UserInfo.from()` 이
   * `user.getRole() != null ? ... : null` 로 넣기 때문이다.
   *
   * **다만 실제로 null 이 오는 경로는 현재 없다.** 로컬 가입(`AuthServiceImpl.signup`)
   * 과 구글 신규 가입(`oauthLogin`) 둘 다 `PREENTREPRENEUR` 를 넣는다 — 예전에는
   * 구글 쪽이 비어 있었으나 지금은 채운다.
   *
   * null 은 예비 창업자로 본다. 직접 비교하지 말고 `isPreOwner()` 를 쓸 것.
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
