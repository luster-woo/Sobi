import type { ReactNode } from 'react'

import Button from '@/shared/ui/Button'
import { cn } from '@/shared/utils/cn'

interface FilterBarProps {
  /** 필터 컨트롤. 169 의 Select · Checkbox 를 넣는다 */
  children: ReactNode
  /** 오른쪽 끝에 붙일 정렬 컨트롤 */
  sort?: ReactNode
  /** 걸려 있는 필터 수. 1 이상이면 초기화 버튼이 나온다 */
  activeCount?: number
  onReset?: () => void
  /**
   * card — 목록과 떨어진 카드 (기본)
   * inline — 표 프레임 안에 얹히는 줄. 검색창과 표 사이에 들어간다
   */
  variant?: 'card' | 'inline'
  className?: string
}

const variantClass = {
  card: 'border-border bg-surface px-card gap-3 rounded-md border py-3.5 items-end',
  // px-4 는 같은 프레임 안의 검색창·건수 줄과 맞춘 값이다 (px-card 15px 이 아니다)
  inline: 'border-border-subtle items-center gap-2 border-b px-4 py-3',
} as const

/**
 * 목록 화면 필터 영역의 레이아웃.
 *
 * 필터 정의를 배열로 받아 컨트롤까지 그리는 방식(filters={[...]})은 택하지 않았다.
 * 화면마다 필터가 다르고(대출은 취급기관·신청가능·관심상품, 지원사업은 소관기관·판정결과),
 * 하나의 설정 타입으로 묶으면 새 필터가 생길 때마다 이 파일을 고쳐야 한다.
 * 여기서는 배치와 초기화만 맡는다.
 *
 * items-end 로 맞추는 이유: Select 는 label 을 위에 그려서 높이가 달라진다.
 * label 있는 컨트롤과 없는 컨트롤을 섞어도 입력칸 아래선이 한 줄로 맞는다.
 */
export default function FilterBar({
  children,
  sort,
  activeCount = 0,
  onReset,
  variant = 'card',
  className,
}: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label="목록 필터"
      className={cn('flex flex-wrap', variantClass[variant], className)}
    >
      {children}

      <div
        className={cn(
          'ml-auto flex shrink-0 gap-2',
          variant === 'card' ? 'items-end' : 'items-center',
        )}
      >
        {activeCount > 0 && onReset && (
          <Button variant="outline" size="sm" onClick={onReset}>
            필터 초기화 ({activeCount})
          </Button>
        )}
        {sort}
      </div>
    </div>
  )
}
