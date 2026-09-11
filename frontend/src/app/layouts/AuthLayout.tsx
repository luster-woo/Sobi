import { Link, Outlet } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import BrandLogo from '@/shared/ui/BrandLogo'

/**
 * 로그인 전·온보딩 화면의 골격. 브랜드 바 하나와 가운데 정렬 컬럼뿐이다.
 * 사이드바를 붙이지 않는다 — 이 흐름의 사용자는 아직 대시보드 권한이 없다.
 */
export function AuthLayout() {
  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <header className="bg-surface border-border h-header flex shrink-0 items-center border-b px-[22px]">
        <Link to={ROUTES.HOME}>
          <BrandLogo />
        </Link>
      </header>

      {/*
       * 위아래 여백이 44·56 이었는데 노트북 높이에서 그것만으로 100px 을 먹어 회원가입·
       * 사업자 인증이 스크롤됐다. 화면 안에 다 들어오는 쪽이 여백보다 중요하다.
       */}
      <main className="flex flex-1 flex-col items-center px-6 pt-5 pb-6">
        <Outlet />
      </main>
    </div>
  )
}
