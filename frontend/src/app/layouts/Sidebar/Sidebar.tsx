import { Link, NavLink } from 'react-router'

import { NAV_ITEMS } from '@/app/layouts/Sidebar/navItems'
import { SidebarBusinessCard } from '@/app/layouts/Sidebar/SidebarBusinessCard'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/utils/cn'

/**
 * 좌측 고정 내비게이션.
 *
 * 자기 위치만 잡는다(`w-sidebar h-full`). 화면에 어떻게 붙일지 — fixed 로 띄울지,
 * grid 한 칸을 차지할지 — 는 131(페이지 레이아웃 셸)이 정한다. 여기서 fixed 를 박으면
 * 셸이 레이아웃을 못 바꾼다.
 *
 * 활성 표시는 NavLink 에 맡긴다. `aria-current="page"` 도 NavLink 가 붙여주므로
 * 낭독기는 색이 아니라 그 속성으로 현재 위치를 안다.
 */
export function Sidebar() {
  return (
    <aside
      aria-label="주요 메뉴"
      className="bg-surface border-border w-sidebar flex h-full shrink-0 flex-col border-r"
    >
      {/* 로고 — 어느 화면에 있든 대시보드로 돌아오는 통로 */}
      <div className="h-header flex shrink-0 items-center px-4">
        <Link
          to={ROUTES.DASHBOARD}
          className="flex items-center gap-2.5 rounded-md px-1 py-1 transition-opacity hover:opacity-80"
        >
          <span
            aria-hidden="true"
            className="bg-secondary text-text-inverse font-heading flex size-7 shrink-0 items-center justify-center rounded-md text-[13px] font-bold"
          >
            돕
          </span>
          <span className="font-heading text-text text-[15px] font-bold">소상공인 도우미</span>
        </Link>
      </div>

      {/* 메뉴가 늘어나면 여기만 스크롤된다. 로고와 업체 카드는 자리에 남는다 */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, to, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'text-body1 relative flex items-center gap-3 rounded-md py-2.5 pr-3 pl-4 transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary font-semibold'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* 좌측 강조 바. 색만으로 구분하지 않게 형태를 하나 더 준다 */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="bg-primary absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full"
                      />
                    )}
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 여백까지 카드가 들고 있다. 예비 창업자는 카드가 없어서, 여백을 여기 두면
          빈 칸만 24px 남는다 */}
      <SidebarBusinessCard />
    </aside>
  )
}
