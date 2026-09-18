import type { SessionUser } from '@/shared/types'
import { USER_ROLE, type UserRole } from '@/shared/types'

/**
 * accessToken 에서 사용자 정보를 꺼낸다.
 *
 * `GET /user/me` 가 백엔드에 생겨서(`UserController.me`) 이제는 **조회가 실패했을 때의
 * 안전망**이다. 쓰는 곳은 `useSession` 한 군데뿐이라, 안전망이 필요 없다고 판단되면
 * 이 파일과 거기 폴백을 같이 지우면 된다.
 *
 * 서명을 검증하지 않는다. 검증은 서버가 한다 — 여기서 꺼낸 값으로 권한을 판단하면 안 되고,
 * 화면에 이름·역할을 그리는 용도로만 쓴다. 위조한 토큰을 넣어도 API 가 401 을 준다.
 */

/** 백엔드 `JwtProvider` 가 넣는 claim. `name` 은 없다 */
interface AccessTokenClaims {
  sub?: string
  email?: string
  /** `user.getRole() != null ? ... : null` 이라 **null 이 실려 온다** */
  role?: string | null
}

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))

    // 한글 이름이 들어올 수 있어 atob 결과를 그대로 쓰지 않는다
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function parseClaims(token: string): AccessTokenClaims | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  const json = decodeBase64Url(payload)
  if (json === null) return null

  try {
    const claims: unknown = JSON.parse(json)
    return typeof claims === 'object' && claims !== null ? (claims as AccessTokenClaims) : null
  } catch {
    return null
  }
}

function toUserRole(value: string | null | undefined): UserRole | null {
  if (value === USER_ROLE.ENTREPRENEUR) return USER_ROLE.ENTREPRENEUR
  if (value === USER_ROLE.PREENTREPRENEUR) return USER_ROLE.PREENTREPRENEUR
  return null
}

/**
 * 토큰만으로 세션 사용자를 복원한다. 정보가 모자라면 null.
 *
 * claim 에 `name` 이 없어 이메일 앞부분으로 대신한다. 상단바에 잠깐 다르게 보일 수 있지만,
 * 새로고침했다고 로그아웃되는 것보다는 낫다.
 *
 * ⚠️ role 이 없어도 복원한다. 지금은 `JwtProvider` 가 claim 을 항상 채우지만,
 *    토큰 형식이 바뀌었을 때 전부 로그아웃시키는 것보다 예비 창업자로 보고 들여보내는
 *    편이 낫다 — null 해석은 `isPreOwner` 를 따른다.
 */
export function sessionUserFromToken(token: string): SessionUser | null {
  const claims = parseClaims(token)
  if (claims === null) return null

  const userId = Number(claims.sub)

  if (!Number.isFinite(userId) || !claims.email) return null

  return {
    userId,
    email: claims.email,
    name: claims.email.split('@')[0],
    role: toUserRole(claims.role),
    /*
     * ⚠️ 여기서의 null 은 '비어 있다' 가 아니라 **'모른다'** 다. JWT claim 에 생년월일이
     *    없어서 복원할 방법이 없다.
     *
     *    생년월일이 비었는지로 무언가를 판단하는 코드는 이 값을 믿으면 안 된다.
     *    지금 그렇게 쓰는 곳은 `OAuthCallbackPage` 하나인데, 거기는 로그인 응답
     *    (`LoginResponse.user.birthDate`)을 직접 보므로 이 폴백을 타지 않는다.
     */
    birthDate: null,
  }
}
