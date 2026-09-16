import { create } from 'zustand'

import type { AuthProvider, SessionUser } from '@/shared/types'

/**
 * 세션 복구 단계.
 *
 * accessToken 을 메모리에만 두는 탓에 새로고침하면 토큰이 사라진다. 그래서 앱 진입 시
 * refresh 로 세션을 한 번 되살리는데, 그 사이를 'loading' 으로 구분한다.
 * 이 구분이 없으면 복구가 끝나기 전에 보호 라우트가 로그인 화면으로 튕겨버린다.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthStore {
  status: AuthStatus
  accessToken: string | null
  /** 로그인 응답이 주는 네 필드뿐이다. 나머지는 마이페이지가 따로 조회한다 */
  user: SessionUser | null

  /**
   * 가입 경로. 소셜 전환 직후 화면을 바꾸려고 들고 있다.
   *
   * ⚠️ 로그인 응답에 이 값이 없어서 처음에는 null 이다. `GET /user/me` 가 붙으면
   *    거기서 받아 채우고, 그때 이 필드는 `user` 안으로 들어가야 한다 (BE-02).
   *    null 이면 화면이 자기 기본값을 쓴다.
   */
  provider: AuthProvider | null

  /**
   * 로그인 직후 갈 곳. null 이면 대시보드다.
   *
   * 가입 흐름 때문에 있다. 가입이 끝나면 사업자 인증(`/verify`)으로 보내야 하는데,
   * 그 화면은 ProtectedRoute 아래라 자동 로그인을 먼저 태워야 한다. 그런데 로그인이
   * 성공하는 순간 `PublicOnlyRoute` 가 authenticated 를 보고 대시보드로 밀어버린다 —
   * `/verify` 는 lazy 라 청크를 받는 동안 라우터가 아직 `/signup` 에 있고, 그 사이에
   * 가드가 다시 렌더되기 때문이다.
   *
   * 화면에서 `navigate` 로 이기려 하면 경합이라 어떤 날은 되고 어떤 날은 안 된다.
   * 그래서 목적지를 여기 적어두고 **가드가 그리로 보내게** 한다 — 이동이 한 번만 일어난다.
   *
   * 로그아웃하면 지워진다. 목적지에 도착한 화면이 볼일을 마치면 직접 지운다.
   */
  postAuthRedirect: string | null

  /** 로그인·세션 복구 성공 시 */
  setSession: (accessToken: string, user: SessionUser) => void
  /** 토큰 재발급 성공 시. user 는 그대로 두고 토큰만 교체한다 */
  setAccessToken: (accessToken: string) => void
  /** 프로필 수정 후 서버 응답으로 갱신할 때 */
  setUser: (user: SessionUser) => void
  /** 소셜 전환 성공 시 */
  setProvider: (provider: AuthProvider) => void
  /** 로그인 직후 갈 곳을 예약한다. 도착한 화면이 볼일을 마치면 null 로 지운다 */
  setPostAuthRedirect: (path: string | null) => void
  /** 로그아웃, 재발급 실패, 복구 실패 모두 여기로 모인다 */
  clearSession: () => void
}

/**
 * 인증 상태.
 *
 * accessToken 은 이 스토어(메모리)에만 둔다. localStorage 에 넣으면 XSS 로 탈취되고,
 * refreshToken 은 서버가 httpOnly 쿠키로 관리해 프론트가 값을 볼 수 없다.
 * 그래서 zustand persist 를 쓰지 않는다 — 새로고침하면 토큰이 사라지는 게 의도된 동작이다.
 *
 * axios 인터셉터(`shared/api/client.ts`)처럼 React 밖에서는 훅을 쓸 수 없으므로
 * `useAuthStore.getState()` 로 접근한다.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  provider: null,
  postAuthRedirect: null,

  setSession: (accessToken, user) => set({ status: 'authenticated', accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setProvider: (provider) => set({ provider }),
  setPostAuthRedirect: (postAuthRedirect) => set({ postAuthRedirect }),
  clearSession: () =>
    set({
      status: 'unauthenticated',
      accessToken: null,
      user: null,
      provider: null,
      // 남겨두면 다음에 로그인한 사람이 엉뚱한 화면으로 간다
      postAuthRedirect: null,
    }),
}))
