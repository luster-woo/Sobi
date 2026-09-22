import { useEffect, useRef } from 'react'
import { Outlet, useMatches } from 'react-router'

import { Sidebar } from '@/app/layouts/Sidebar/Sidebar'
import { Topbar } from '@/app/layouts/Topbar/Topbar'

/**
 * 로그인 후 화면들의 골격. 사이드바 · 상단바 · 본문.
 * 로그인·회원가입은 이 아래에 두지 않는다 — 셸이 붙으면 안 된다.
 */
export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const matches = useMatches()

  /*
   * 지금 보고 있는 '페이지'. handle.modal 인 라우트는 빼고 가장 깊은 것을 쓴다.
   *
   * pathname 을 그대로 쓰면 목록 위에 상세 모달이 뜰 때(/loans → /loans/12)도 바뀌어서
   * 모달 뒤의 목록이 맨 위로 튄다. 모달을 닫을 때 또 한 번 튄다.
   * 검색어·필터는 search 라 여기 안 들어온다 — 상권을 바꿔도 스크롤이 유지된다.
   */
  const pageKey =
    matches.filter((match) => !(match.handle as { modal?: boolean } | undefined)?.modal).at(-1)
      ?.pathname ?? ''

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pageKey])

  return (
    <div className="bg-bg flex h-dvh overflow-hidden">
      <Sidebar />

      {/* min-w-0 이 없으면 넓은 표가 있는 화면에서 본문이 사이드바를 밀어낸다 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        {/* 스크롤은 여기만. 상단바를 sticky 로 두지 않아 드롭다운·모달과 z-index 로 다툴 일이 없다 */}
        <main ref={mainRef} className="p-section min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
