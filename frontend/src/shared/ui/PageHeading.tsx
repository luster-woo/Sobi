import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface PageHeadingProps {
  title: string
  /** 제목 오른쪽에 붙는 것. 갱신 시각·버튼 */
  aside?: ReactNode
  /**
   * 상단바가 h1 으로 화면 이름을 그리는 자리(AppLayout)는 h2 를 쓴다 —
   * 한 화면에 h1 이 둘이면 낭독기가 어느 쪽이 제목인지 알 수 없다.
   * 상단바가 없는 인증·온보딩 화면만 h1 이다.
   */
  level?: 'h1' | 'h2'
  className?: string
}

/**
 * 화면 안쪽 제목 줄.
 *
 * 예전에는 화면마다 제목을 직접 그려서 text-h1(28) · text-[20px] · text-[21px] ·
 * text-[23px] 네 크기가 돌아다녔고, 같은 위계를 h1 과 h2 로 번갈아 썼다.
 * 크기는 text-h2 하나로 모으고 태그만 화면 종류에 따라 고른다.
 */
export default function PageHeading({ title, aside, level = 'h2', className }: PageHeadingProps) {
  const Tag = level

  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <Tag className="text-h2 text-text tracking-[-0.02em]">{title}</Tag>
      {aside}
    </div>
  )
}
