import { Link, Outlet, useLocation } from 'react-router-dom'
import Logo from './Logo'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-30 h-header border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          <Logo />
          {isLanding && (
            <nav className="typo-body2 text-text-secondary">
              <Link to="/login" className="hover:text-text">
                로그인
              </Link>
              <span className="mx-1.5 text-text-disabled">/</span>
              <Link to="/signup/terms" className="hover:text-text">
                회원가입
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="pt-header">
        {isLanding ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-[1200px] px-6 pb-16">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
