import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/utils/cn'

/** 시안 .panel 과 같은 프레임. shared/ui/Panel 은 div 만 그려서 링크 카드에 쓸 수 없다 */
const FRAME = 'border-border bg-surface flex flex-col gap-[11px] rounded-md border px-[15px] py-3'

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="text-text-disabled size-3.5 shrink-0"
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

interface MiniPanelProps {
  /** 제목 위 작은 설명. '업종별 필수 가입 항목' */
  label?: string
  title: string
  /** 제목 오른쪽 자리. 배지를 넣는다. to 와 같이 쓰면 화살표 대신 이것이 그려진다 */
  aside?: ReactNode
  /** 카드 전체를 링크로 만든다 */
  to?: string
  children: ReactNode
  /** 맨 아래 한 줄 각주. 숫자만으로 안 보이는 것을 적는다 */
  note?: string | null
  className?: string
}

/**
 * 오른쪽 열의 요약 카드 (시안의 .panel.mini).
 *
 * 세 카드(상환 관리·의무보험·내 사업장 정보)가 제목 줄 구조를 공유한다. 각자 그리면
 * 제목 크기와 여백이 조금씩 어긋나는데, 좁은 열에 세로로 붙어 있어 그 차이가 바로 보인다.
 *
 * 카드 전체를 링크로 만들 수 있게 한 이유: 요약 카드는 "자세히 보기" 가 유일한 동작이다.
 * 안에 작은 링크를 두면 좁은 열에서 눌러야 할 곳을 찾게 된다.
 */
export default function MiniPanel({
  label,
  title,
  aside,
  to,
  children,
  note,
  className,
}: MiniPanelProps) {
  const body = (
    <>
      <div>
        {label && <p className="text-text-muted mb-0.5 text-[11px]">{label}</p>}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-text text-body2 font-bold">{title}</h3>
          {aside ?? (to && <Chevron />)}
        </div>
      </div>

      {children}

      {note && <p className="text-text-muted text-[11px] leading-[1.7]">{note}</p>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn(FRAME, 'hover:border-border-strong transition-colors', className)}>
        {body}
      </Link>
    )
  }

  return <div className={cn(FRAME, className)}>{body}</div>
}
