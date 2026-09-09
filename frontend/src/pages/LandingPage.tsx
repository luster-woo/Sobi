import { Link, useNavigate } from 'react-router'

import ClosingCta from '@/features/landing/components/ClosingCta'
import FeatureBands from '@/features/landing/components/FeatureBands'
import HeroSection from '@/features/landing/components/HeroSection'
import { ROUTES } from '@/shared/constants/routes'
import BrandLogo from '@/shared/ui/BrandLogo'

/**
 * 비로그인 방문자가 처음 보는 화면. AppLayout(사이드바·상단바) 아래에 두지 않는다.
 */
export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-bg min-h-dvh">
      <header className="bg-surface border-border h-header flex items-center justify-between border-b px-[22px]">
        <Link to={ROUTES.HOME}>
          <BrandLogo />
        </Link>

        <nav className="flex items-center gap-3.5">
          <Link to={ROUTES.LOGIN} className="text-body2 text-text-secondary hover:text-text">
            로그인
          </Link>
          {/* 가입은 약관 동의(03)부터 시작한다. /signup 으로 바로 보내면 동의 단계가 빠진다 */}
          <Link
            to={ROUTES.TERMS}
            className="border-border-strong bg-surface text-text font-heading text-body2 inline-flex h-[34px] items-center rounded-sm border px-3 font-medium"
          >
            회원가입
          </Link>
        </nav>
      </header>

      <main>
        <HeroSection
          onSignUp={() => navigate(ROUTES.TERMS)}
          onLogin={() => navigate(ROUTES.LOGIN)}
        />

        <div className="h-[34px]" />

        <FeatureBands />
        <ClosingCta onStart={() => navigate(ROUTES.TERMS)} />
      </main>
    </div>
  )
}
