import type { ComponentType, SVGProps } from 'react'

import { ROUTES } from '@/shared/constants/routes'
import {
  ApplicationIcon,
  DashboardIcon,
  FundingPlanIcon,
  LoanIcon,
  MarketAnalysisIcon,
  MypageIcon,
  RepaymentIcon,
  SupportProgramIcon,
} from '@/shared/ui/icons'

export interface NavItem {
  label: string
  to: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * 사이드바 메뉴 8개. 배열 순서가 곧 화면 순서다.
 *
 * 경로를 문자열로 직접 쓰지 않고 `ROUTES` 를 참조한다. 경로가 바뀌면 여기도 같이
 * 따라가야 하는데, 문자열을 박아두면 타입 에러 없이 조용히 404 가 된다.
 *
 * 활성 판정은 NavLink 의 기본 동작(하위 경로 포함)에 맡긴다. 그래야 `/loans/12`
 * 상세에 들어가도 '대출' 메뉴가 켜진 채로 남는다.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: '대시보드', to: ROUTES.DASHBOARD, Icon: DashboardIcon },
  { label: '상권 분석', to: ROUTES.MARKET_ANALYSIS, Icon: MarketAnalysisIcon },
  { label: '대출', to: ROUTES.LOANS, Icon: LoanIcon },
  { label: '지원사업', to: ROUTES.SUPPORT_PROGRAMS, Icon: SupportProgramIcon },
  { label: '자금 조합', to: ROUTES.FUNDING_PLAN, Icon: FundingPlanIcon },
  { label: '상환 관리', to: ROUTES.LOAN_REPAYMENTS, Icon: RepaymentIcon },
  { label: '신청 현황', to: ROUTES.APPLICATIONS, Icon: ApplicationIcon },
  { label: '마이페이지', to: ROUTES.MYPAGE, Icon: MypageIcon },
] as const
