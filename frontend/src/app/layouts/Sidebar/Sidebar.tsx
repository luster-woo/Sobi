import { Link, NavLink } from 'react-router'

import { NAV_ITEMS } from '@/app/layouts/Sidebar/navItems'
import { SidebarBusinessCard } from '@/app/layouts/Sidebar/SidebarBusinessCard'
import { ROUTES } from '@/shared/constants/routes'
import { useSidebarStore } from '@/shared/lib/store/useSidebarStore'
import BrandLogo from '@/shared/ui/BrandLogo'
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
 *
 * 접으면 폭만 줄인다(210 → 56). 본문은 flex-1 이라 이 폭이 줄어드는 만큼 저절로
 * 늘어난다 — 본문에 따로 여백을 계산해 넣지 않는다. 접고 펴는 버튼은 상단바에 있다.
 * 여기 두면 접을 때 버튼도 같이 움직여서 다시 펴려면 눈으로 찾아야 한다.
 */
export function Sidebar() {
  const collapsed = useSidebarStore((state) => state.collapsed)

  return (
    <aside
      id="app-sidebar"
      aria-label="주요 메뉴"
      className={cn(
        'bg-surface border-border flex h-full shrink-0 flex-col overflow-hidden border-r',
        /*
         * 폭만 바꾼다. 안쪽 요소를 각각 움직이면 글자가 눌렸다 펴지는 게 보인다 —
         * overflow-hidden 으로 잘라내고 글자는 아래에서 흐려지기만 한다.
         */
        'transition-[width] duration-200 ease-out motion-reduce:transition-none',
        collapsed ? 'w-sidebar-rail' : 'w-sidebar',
      )}
    >
      {/* 로고 — 어느 화면에 있든 대시보드로 돌아오는 통로 */}
      <div className={cn('h-header flex shrink-0 items-center', collapsed ? 'px-0' : 'px-4')}>
        <Link
          to={ROUTES.DASHBOARD}
          aria-label="대시보드로"
          className={cn(
            'rounded-sm py-1 transition-opacity hover:opacity-80',
            collapsed ? 'mx-auto px-0' : 'px-1',
          )}
        >
          {/* 접으면 마크만 남는다. 워드마크는 56px 에 들어가지 않는다 */}
          <BrandLogo markOnly={collapsed} />
        </Link>
      </div>

      {/* 메뉴가 늘어나면 여기만 스크롤된다. 로고와 업체 카드는 자리에 남는다 */}
      <nav
        className={cn(
          'min-h-0 flex-1 overflow-y-auto py-1.5',
          collapsed ? 'px-2' : 'px-[11px]',
        )}
      >
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, to, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                /* 접으면 이름이 안 보인다. 아이콘만으로 못 알아보는 사람에게 남겨둔다 */
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'text-body2 relative flex items-center rounded-sm py-2 transition-colors',
                    collapsed ? 'justify-center px-0' : 'gap-2.5 pr-3 pl-[11px]',
                    isActive
                      ? 'bg-primary-soft text-primary font-medium'
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
                        className="bg-primary absolute top-1/2 left-0 h-[15px] w-[3px] -translate-y-1/2 rounded-r-full"
                      />
                    )}
                    <Icon className="size-[17px] shrink-0" />
                    {/*
                      지우지 않고 폭을 0 으로 만든다. 지우면 낭독기가 메뉴 이름을 잃고,
                      다시 펼 때 글자가 튀어나온다. 폭이 줄어드는 동안 흐려지기만 한다.
                    */}
                    <span
                      className={cn(
                        'truncate transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none',
                        collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100',
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/*
        여백까지 카드가 들고 있다. 예비 창업자는 카드가 없어서, 여백을 여기 두면
        빈 칸만 24px 남는다.

        접으면 흐려지기만 하고 자리는 남긴다. 지우면 사이드바 아래쪽이 폭과 함께
        높이까지 한 번에 바뀌어 두 방향으로 출렁인다.
      */}
      <div
        aria-hidden={collapsed}
        className={cn(
          'transition-opacity duration-150 ease-out motion-reduce:transition-none',
          collapsed && 'pointer-events-none opacity-0',
        )}
      >
        <SidebarBusinessCard />
      </div>
    </aside>
  )
}
