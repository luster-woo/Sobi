import { useLocation } from 'react-router'

import { NotificationBell } from '@/app/layouts/Topbar/NotificationBell'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { resolvePageTitle } from '@/shared/constants/pageTitles'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

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

  const title = resolvePageTitle(pathname)

  return (
    <header className="bg-surface border-border h-header flex shrink-0 items-center justify-between gap-4 border-b px-5">
      {/* h1 은 사이드바 로고가 아니라 이 문구다. 로고를 h1 으로 두면 모든 화면 제목이 같아진다 */}
      {title ? (
        <h1 className="font-heading truncate text-[16.5px] font-bold">{title}</h1>
      ) : (
        <span />
      )}

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
