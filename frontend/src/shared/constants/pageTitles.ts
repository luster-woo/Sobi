import { ROUTES } from '@/shared/constants/routes'

/** 상단바 화면 이름. 새 화면을 추가하면 여기에 한 줄 넣는다 */
export const PAGE_TITLES: Readonly<Record<string, string>> = {
  [ROUTES.DASHBOARD]: '대시보드',
  [ROUTES.MARKET_ANALYSIS]: '상권 분석',
  [ROUTES.LOANS]: '대출',
  [ROUTES.SUPPORT_PROGRAMS]: '지원금',
  [ROUTES.FUNDING_PLAN]: '자금 조합',
  [ROUTES.LOAN_REPAYMENTS]: '상환 관리',
  [ROUTES.APPLICATIONS]: '신청 현황',
  [ROUTES.MYPAGE]: '마이페이지',
}

/** 못 찾으면 빈 문자열. 접두사로 찾아 `/loans/12` 에서도 '대출' 이 나온다 */
export function resolvePageTitle(pathname: string): string {
  const matched = Object.keys(PAGE_TITLES)
    // 긴 것부터. `/loans` 와 `/loans/compare` 가 같이 있으면 구체적인 쪽이 이겨야 한다
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]

  return matched ? PAGE_TITLES[matched] : ''
}
