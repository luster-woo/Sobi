import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import { useRole } from '@/shared/lib/session'
import { mockBusiness } from '@/mocks/user.mock'
import { cn } from '@/shared/lib/format'

const menus = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/market', label: '상권 분석' },
  { to: '/loans', label: '대출' },
  { to: '/supports', label: '지원금' },
  { to: '/funding', label: '자금 조합' },
  { to: '/repayments', label: '상환 관리' },
  { to: '/applications', label: '신청 현황' },
  { to: '/mypage', label: '마이페이지' },
]

export default function AppSidebar() {
  const role = useRole()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-sidebar flex-col border-r border-border bg-surface">
      <div className="flex h-header items-center px-6">
        <Logo to="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4 pt-2">
        {menus.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 typo-label-sm transition-colors',
                isActive ? 'bg-primary-soft text-text' : 'text-text-secondary hover:bg-surface-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-[3px] border',
                    isActive ? 'border-primary bg-primary' : 'border-border-strong bg-surface',
                  )}
                />
                {m.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
          <span className="size-8 shrink-0 rounded-full bg-border" aria-hidden="true" />
          <div className="min-w-0">
            <p className="typo-label-sm truncate">{role === 'pre' ? '예비 창업자' : mockBusiness.storeName}</p>
            <p className="typo-caption truncate text-text-muted">
              {role === 'pre' ? '대구·한식 음식점 준비 중' : '대구·한식 음식점업'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
