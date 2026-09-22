import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/utils/cn'

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="text-text-disabled size-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

interface LinkRowProps {
  label: string
  /** 오른쪽에 붙는 값. '진행 중 1건' · '2026. 9. 2 갱신' */
  value?: ReactNode
  /** 있으면 눌러서 이동하는 줄이 되고 화살표가 붙는다 */
  to?: string
  className?: string
}

/**
 * 패널 안의 한 줄 (시안의 .lnk).
 *
 * 같은 모양이 두 가지로 쓰인다 — 마이데이터 갱신 시각처럼 읽기만 하는 줄과,
 * 바로가기처럼 눌러서 이동하는 줄. 화살표 유무로 구분되며 to 가 그것을 정한다.
 */
export default function LinkRow({ label, value, to, className }: LinkRowProps) {
  const body = (
    <>
      <span className="text-text text-body2 min-w-0 flex-1 truncate">{label}</span>
      {value && <span className="text-text-muted text-caption shrink-0 tabular-nums">{value}</span>}
      {to && <Chevron />}
    </>
  )

  const base =
    'border-border-subtle flex items-center gap-3 border-b px-card py-2.5 last:border-b-0'

  if (to) {
    return (
      <Link to={to} className={cn(base, 'hover:bg-surface-muted transition-colors', className)}>
        {body}
      </Link>
    )
  }

  return <div className={cn(base, className)}>{body}</div>
}
