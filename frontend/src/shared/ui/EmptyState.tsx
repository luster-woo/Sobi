import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface EmptyStateProps {
  title: string
  description?: string
  /** 아이콘. 넘기지 않으면 아이콘 영역 자체가 없습니다 */
  icon?: ReactNode
  /** 다음 행동 버튼. 보통 <Button>. EmptyState 는 라우팅을 모릅니다 */
  action?: ReactNode
  /**
   * md — 화면·목록 전체가 비었을 때 (기본)
   * sm — 알림 패널·카드 안처럼 좁은 영역
   */
  size?: 'md' | 'sm'
  className?: string
}

const sizeClass = {
  md: {
    wrap: 'gap-3 py-16',
    icon: 'size-12',
    title: 'text-h4',
    description: 'text-body2',
  },
  sm: {
    wrap: 'gap-2 py-10',
    icon: 'size-9',
    title: 'text-body2 font-semibold',
    description: 'text-caption',
  },
} as const

/**
 * 보여줄 데이터가 없을 때 자리를 채웁니다.
 *
 * 빈 화면을 그냥 두면 사용자가 고장으로 오해합니다. "왜 비었는지"와
 * "그래서 뭘 하면 되는지"를 같이 줘야 다음 행동으로 이어집니다.
 *
 * 로딩 중에는 쓰지 마세요. 그건 Skeleton·Spinner 의 몫이고, 로딩 중에
 * "비어 있어요"가 잠깐 스치면 사용자가 잘못된 정보를 봅니다.
 * 조회가 끝났고 결과가 0건일 때만 렌더.
 *
 * action 을 ReactNode 로 받는 이유: 이동할 경로와 문구가 화면마다 달라서
 * 여기서 Button·Link 를 직접 만들면 shared 가 라우팅을 알게 됩니다.
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const s = sizeClass[size]

  return (
    <div className={cn('flex flex-col items-center text-center', s.wrap, className)}>
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            'bg-bg text-text-muted flex items-center justify-center rounded-full',
            s.icon,
          )}
        >
          {icon}
        </span>
      )}

      <p className={cn('text-text', s.title)}>{title}</p>
      {description && (
        <p className={cn('text-text-muted max-w-[320px]', s.description)}>{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
