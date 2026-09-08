import { Outlet } from 'react-router'

import { Sidebar } from '@/app/layouts/Sidebar/Sidebar'
import { Topbar } from '@/app/layouts/Topbar/Topbar'

/**
 * 로그인 후 화면들의 골격. 사이드바 · 상단바 · 본문.
 * 로그인·회원가입은 이 아래에 두지 않는다 — 셸이 붙으면 안 된다.
 */
export function AppLayout() {
  return (
    <div className="bg-bg flex h-dvh overflow-hidden">
      <Sidebar />

      {/* min-w-0 이 없으면 넓은 표가 있는 화면에서 본문이 사이드바를 밀어낸다 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        {/* 스크롤은 여기만. 상단바를 sticky 로 두지 않아 드롭다운·모달과 z-index 로 다툴 일이 없다 */}
        <main className="p-section min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
