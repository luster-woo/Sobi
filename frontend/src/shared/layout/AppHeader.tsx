import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconBell } from '@/shared/ui/Icon'
import NotificationPanel from './NotificationPanel'
import { mockNotifications, mockPreUser, mockUser } from '@/mocks/user.mock'
import { useRole } from '@/shared/lib/session'

/** 경로 → 헤더 제목. 하위 경로는 앞부분만 맞으면 됨 */
const TITLES: Array<[string, string]> = [
  ['/dashboard', '대시보드'],
  ['/market', '상권 분석'],
  ['/loans', '대출'],
  ['/supports', '지원금'],
  ['/funding', '자금 조합'],
  ['/repayments', '상환 관리'],
  ['/applications', '신청 현황'],
  ['/mypage', '마이페이지'],
  ['/bookmarks', '마이페이지'],
  ['/_gallery', '컴포넌트 갤러리'],
]

export default function AppHeader() {
  const { pathname } = useLocation()
  const role = useRole()
  const user = role === 'pre' ? mockPreUser : mockUser
  const [open, setOpen] = useState(false)
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? ''
  const unread = mockNotifications.some((n) => !n.read)

  return (
    <header className="sticky top-0 z-30 flex h-header items-center justify-between border-b border-border bg-surface px-section">
      <h1 className="typo-h4 font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            aria-label="알림"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative inline-flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted"
          >
            <IconBell size={18} />
            {unread && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />}
          </button>
          {open && <NotificationPanel items={mockNotifications} onClose={() => setOpen(false)} />}
        </div>

        <span className="typo-body1 text-text">
          반갑습니다, <span className="font-semibold">{user.name}</span> 님
        </span>
        <Link to="/" className="typo-body2 text-text-muted hover:text-text">
          로그아웃
        </Link>
      </div>
    </header>
  )
}
