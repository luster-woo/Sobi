import type { SVGProps } from 'react'

/**
 * 인라인 SVG 아이콘.
 *
 * 아이콘 라이브러리를 넣지 않았다. 쓰는 개수가 열 개 남짓이고 전부 사이드바·상단바 같은
 * 골격에만 붙어서, 세트 전체를 번들에 넣는 것보다 필요한 path 만 두는 편이 가볍다.
 *
 * 규칙:
 * - `stroke="currentColor"` 로 색을 부모의 text 색에 맡긴다. 활성/비활성 전환이
 *   className 하나로 끝난다.
 * - 크기는 밖에서 정한다(`className="size-5"`). width/height 를 박지 않는다.
 * - 장식용이라 `aria-hidden` 이 기본이다. 아이콘만 있는 버튼은 버튼 쪽에
 *   `aria-label` 을 달아야 한다.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

/**
 * 대시보드 — 카드가 나뉜 화면.
 *
 * 대각선끼리 크기가 같다. 좌상·우하가 긴 카드(7.5×10), 우상·좌하가 짧은 카드(7.5×5)다.
 * 네 칸을 제각각 두면 20px 에서 그냥 얼룩으로 보인다. 대각 대칭이 있으면 규칙이 읽힌다.
 */
export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7.5" height="10" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="3" y="16" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
    </svg>
  )
}

/** 상권 분석 — 지역 지표 막대 */
export function MarketAnalysisIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 20.5V11" />
      <path d="M9 20.5V4.5" />
      <path d="M15 20.5v-7" />
      <path d="M21 20.5V8" />
    </svg>
  )
}

/** 대출 — 지폐 */
export function LoanIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </svg>
  )
}

/**
 * 지원금 — 지원사업을 내주는 기관 건물.
 *
 * 돈 모양을 쓰지 않았다. 대출이 지폐라서 지원금까지 돈으로 그리면 20px 에서 두 메뉴가
 * 구분되지 않는다. 획이 다섯 개뿐이라 작은 크기에서도 뭉치지 않는다.
 */
export function SupportProgramIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 9.5 12 4.5l9.5 5" />
      <path d="M4.5 20.5h15" />
      <path d="M6.5 9.5v11M12 9.5v11M17.5 9.5v11" />
    </svg>
  )
}

/** 자금 조합 — 여러 상품을 겹쳐 묶는다 */
export function FundingPlanIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 2.5 8.5 4.5L12 11.5 3.5 7z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 17 8.5 4.5 8.5-4.5" />
    </svg>
  )
}

/** 상환 관리 — 상환일이 찍힌 달력 */
export function RepaymentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="m9 14.5 2 2 4-4" />
    </svg>
  )
}

/** 신청 현황 — 접수된 서류 */
export function ApplicationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3.5h6A1.5 1.5 0 0 1 16.5 5v.5H18A1.5 1.5 0 0 1 19.5 7v13a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V7A1.5 1.5 0 0 1 6 5.5h1.5V5A1.5 1.5 0 0 1 9 3.5z" />
      <path d="M8.5 11.5h7M8.5 15.5h4.5" />
    </svg>
  )
}

/** 마이페이지 — 사용자 */
export function MypageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

/** 관심 목록 — 북마크 리본. 카드의 즐겨찾기 버튼과 같은 모양이라야 같은 것으로 읽힌다 */
export function BookmarkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

/** 알림 — 상단바 벨. 빨간 점은 감싸는 쪽에서 겹쳐 그린다 */
export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18.5 16.5V10a6.5 6.5 0 0 0-13 0v6.5l-1.5 2.5h16z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  )
}

/**
 * 사이드바 여닫기 — 왼쪽 칸이 나뉜 패널.
 *
 * 화살표를 쓰지 않는다. 방향 화살표는 접힌 상태에 따라 뒤집어야 하는데, 뒤집히는
 * 순간 무엇을 가리키는지 읽기 어려워진다. 모양을 고정하고 상태는 aria-expanded 로
 * 알린다 — 눈으로는 '사이드바를 다루는 버튼' 하나로만 보이면 된다.
 */
export function SidebarToggleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9.5 4v16" />
    </svg>
  )
}

/** 업체 — 사이드바 하단 카드의 자리 표시 */
export function StoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v9.5h16V10" />
      <path d="M3 10 4.8 4.5h14.4L21 10a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
      <path d="M10 19.5V14h4v5.5" />
    </svg>
  )
}
