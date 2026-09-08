import { cn } from '@/shared/utils/cn'

interface SkeletonProps {
  /**
   * rect   — 카드·이미지·차트 영역 (기본)
   * text   — 글자 한 줄
   * circle — 아바타·아이콘 자리
   */
  variant?: 'rect' | 'text' | 'circle'
  width?: number | string
  height?: number | string
  className?: string
}

const variantClass = {
  rect: 'rounded-md',
  text: 'rounded-sm',
  circle: 'rounded-full',
} as const

/**
 * 데이터가 오기 전 자리를 잡아두는 회색 블록.
 *
 * 들어올 내용의 모양을 아는 자리에 씁니다. 그러면 로딩이 끝나도 레이아웃이 튀지 않습니다.
 * 모양을 모르거나 화면 전체가 대기 중이면 Spinner 를 쓰세요.
 *
 * 여러 줄·여러 개는 이 컴포넌트를 조합해서 만듭니다. variant 를 늘리기보다
 * 화면에서 필요한 모양대로 쌓는 편이 실제 레이아웃과 잘 맞습니다.
 *
 * aria-hidden 인 이유: 회색 블록 자체는 읽을 내용이 없습니다. 낭독기에 알리려면
 * 감싸는 쪽에 role="status" 와 sr-only 문구를 두세요
 */
export default function Skeleton({ variant = 'rect', width, height, className }: SkeletonProps) {
  const style =
    variant === 'circle'
      ? { width: width ?? 40, height: height ?? width ?? 40 }
      : { width: width ?? '100%', height: height ?? (variant === 'text' ? 14 : 80) }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-border block animate-pulse motion-reduce:animate-none',
        variantClass[variant],
        className,
      )}
      style={style}
    />
  )
}
