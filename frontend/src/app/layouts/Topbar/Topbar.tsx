import { useLocation } from 'react-router'

import { NotificationBell } from '@/app/layouts/Topbar/NotificationBell'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { resolvePageTitle } from '@/shared/constants/pageTitles'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useSidebarStore } from '@/shared/lib/store/useSidebarStore'
import { SidebarToggleIcon } from '@/shared/ui/icons'

/**
 * 알림 벨을 그릴지.
 *
 * 백엔드에 알림 도메인이 아직 없다 — `NotificationController` 자체가 없어서
 * `/notifications` · `/notifications/unread-count` 가 전부 목으로만 응답한다.
 * 실서버에서는 벨이 계속 실패하거나 가짜 개수를 띄우므로 잠시 내린다.
 *
 * ⚠️ **코드를 지운 것이 아니다.** `NotificationBell` · `NotificationDropdown` ·
 *    `features/notification` · 목 핸들러가 다 그대로 있다. 백엔드가 올라오면
 *    이 값을 true 로 되돌리면 된다.
 *
 * 렌더를 막으면 조회도 같이 멈춘다 — 훅이 벨 안에 있어서 마운트되지 않으면
 * 요청이 나가지 않는다.
 */
const SHOW_NOTIFICATION_BELL = false

/**
 * 상단 고정 바. 자기 높이만 잡고 배치는 131(레이아웃 셸)이 정한다.
 * 제목은 현재 경로에서 뽑으므로 페이지가 넘길 필요가 없다.
 */
export function Topbar() {
  const { pathname } = useLocation()
  const userName = useAuthStore((s) => s.user?.name)
  const { mutate: requestLogout, isPending } = useLogout()

  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggleSidebar = useSidebarStore((s) => s.toggle)

  const title = resolvePageTitle(pathname)

  return (
    <header className="bg-surface border-border h-header flex shrink-0 items-center justify-between gap-3 border-b px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {/*
          사이드바 여닫기. 사이드바가 아니라 여기 둔다 — 접으면 사이드바가 좁아지면서
          그 안의 버튼도 같이 옮겨가서, 다시 펴려면 버튼을 눈으로 찾아야 한다.
          상단바는 폭이 변해도 왼쪽 끝이 그대로다.
        */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          aria-label={collapsed ? '사이드바 열기' : '사이드바 접기'}
          title={collapsed ? '사이드바 열기' : '사이드바 접기'}
          className="text-text-secondary hover:bg-surface-muted hover:text-text -ml-1.5 shrink-0 rounded-sm p-1.5 transition-colors"
        >
          <SidebarToggleIcon className="size-[18px]" />
        </button>

        {/* h1 은 사이드바 로고가 아니라 이 문구다. 로고를 h1 으로 두면 모든 화면 제목이 같아진다 */}
        {title && <h1 className="text-h4 truncate font-bold">{title}</h1>}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {SHOW_NOTIFICATION_BELL && <NotificationBell />}

        {/* 세션 복구 중이거나 소셜 가입 직후에는 이름이 없다 */}
        {userName && (
          <p className="text-body2 text-text-secondary hidden sm:block">
            반갑습니다, <span className="text-text font-semibold">{userName}</span> 님
          </p>
        )}

        <button
          type="button"
          onClick={() => requestLogout()}
          disabled={isPending}
          className="text-body2 text-text-secondary hover:text-text rounded-sm px-2 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
