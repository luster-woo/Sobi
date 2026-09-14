import type { SessionUser } from '@/shared/types'
import { USER_ROLE, type UserRole } from '@/shared/types'

/**
 * accessToken 에서 사용자 정보를 꺼낸다.
 *
 * ⚠️ 임시 수단이다. 원래는 `GET /user/me` 가 줘야 하는데 백엔드에 아직 없다
 *    (`com.sobi.user` 에 controller·service·dto 전무, BE-02). 그게 붙으면 이 파일을
 *    쓰는 곳은 `useSession` 한 군데뿐이라 거기만 지우면 된다.
 *
 * 서명을 검증하지 않는다. 검증은 서버가 한다 — 여기서 꺼낸 값으로 권한을 판단하면 안 되고,
 * 화면에 이름·역할을 그리는 용도로만 쓴다. 위조한 토큰을 넣어도 API 가 401 을 준다.
 */

/** 백엔드 `JwtProvider` 가 넣는 claim. `name` 은 없다 */
interface AccessTokenClaims {
  sub?: string
  email?: string
  role?: string
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

function toUserRole(value: string | undefined): UserRole | null {
  if (value === USER_ROLE.ENTREPRENEUR) return USER_ROLE.ENTREPRENEUR
  if (value === USER_ROLE.PREENTREPRENEUR) return USER_ROLE.PREENTREPRENEUR
  return null
}

/**
 * 토큰만으로 세션 사용자를 복원한다. 정보가 모자라면 null.
 *
 * claim 에 `name` 이 없어 이메일 앞부분으로 대신한다. 상단바에 잠깐 다르게 보일 수 있지만,
 * 새로고침했다고 로그아웃되는 것보다는 낫다.
 */
export function sessionUserFromToken(token: string): SessionUser | null {
  const claims = parseClaims(token)
  if (claims === null) return null

  const userId = Number(claims.sub)
  const role = toUserRole(claims.role)

  if (!Number.isFinite(userId) || !claims.email || role === null) return null

  return {
    userId,
    email: claims.email,
    name: claims.email.split('@')[0],
    role,
  }
}
