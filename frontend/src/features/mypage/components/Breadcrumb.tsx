import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface BreadcrumbProps {
  parentLabel: string
  parentTo: string
  current: string
  /** 제목 오른쪽에 붙는 것. 갱신 시각·버튼 */
  aside?: ReactNode
}

/**
 * 하위 화면의 경로 표시와 제목 (시안의 .crumb + 큰 제목).
 *
 * 상단바 제목이 경로 접두사로 정해져서(`resolvePageTitle`) `/mypage/favorites` 에서도
 * '마이페이지' 라고만 나온다. 지금 어디에 있는지와 돌아갈 길은 여기가 알려준다.
 */
export default function Breadcrumb({ parentLabel, parentTo, current, aside }: BreadcrumbProps) {
  return (
    <div>
      <p className="text-text-muted text-caption mb-1">
        <Link to={parentTo} className="hover:text-text-secondary transition-colors">
          {parentLabel}
        </Link>
        <span aria-hidden="true" className="px-1.5">
          ›
        </span>
        <span className="text-text-secondary">{current}</span>
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-text text-[20px] font-bold tracking-[-0.02em]">
          {current}
        </h2>
        {aside}
      </div>
    </div>
  )
}
