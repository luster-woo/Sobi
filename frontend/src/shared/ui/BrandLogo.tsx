import { cn } from '@/shared/utils/cn'

interface BrandLogoProps {
  /** 마크만 남기고 워드마크를 숨긴다 */
  markOnly?: boolean
  className?: string
}

/**
 * 서비스 로고. 링크가 아니다 — 누르면 갈 곳이 화면마다 달라서 감싸는 쪽에서 Link 로 덮는다.
 */
export default function BrandLogo({ markOnly = false, className }: BrandLogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="bg-primary text-text-inverse font-heading flex size-[25px] shrink-0 items-center justify-center rounded-sm text-[12px] font-bold"
      >
        돕
      </span>

      {markOnly ? (
        <span className="sr-only">소상공인 도우미</span>
      ) : (
        <span className="font-heading text-text text-[14.5px] font-bold">소상공인 도우미</span>
      )}
    </span>
  )
}
