import { useSyncExternalStore } from 'react'

import type { UserRole } from '@/types'

/* ------------------------------------------------------------------
   목업용 세션 — 사업자(owner) / 예비창업자(pre) 역할만 기억한다.
   실제 로그인·토큰 처리는 API 연동 단계에서 교체.
------------------------------------------------------------------ */
const KEY = 'sobi.mock.role'
const listeners = new Set<() => void>()

function read(): UserRole {
  try {
    return (localStorage.getItem(KEY) as UserRole) || 'owner'
  } catch {
    return 'owner'
  }
}

export function setRole(role: UserRole) {
  try {
    localStorage.setItem(KEY, role)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useRole(): UserRole {
  return useSyncExternalStore(subscribe, read, () => 'owner')
}
