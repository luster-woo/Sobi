import { create } from 'zustand'

import type { User } from '@/shared/types'

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
  user: User | null

  /** 로그인·세션 복구 성공 시 */
  setSession: (accessToken: string, user: User) => void
  /** 토큰 재발급 성공 시. user 는 그대로 두고 토큰만 교체한다 */
  setAccessToken: (accessToken: string) => void
  /** 프로필 수정 후 서버 응답으로 갱신할 때 */
  setUser: (user: User) => void
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

  setSession: (accessToken, user) => set({ status: 'authenticated', accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ status: 'unauthenticated', accessToken: null, user: null }),
}))
