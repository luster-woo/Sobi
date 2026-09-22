import { cn } from '@/shared/utils/cn'

interface BrandLogoProps {
  /** 마크만 남기고 워드마크를 숨긴다 */
  markOnly?: boolean
  className?: string
}

/**
 * 브랜드 마크. `public/favicon.svg` 와 같은 도형이라 한쪽만 고치면 탭과 화면이 갈린다.
 *
 * 차양이 가게, 두 줄이 서류, 맞물린 조각의 체크가 조건 매칭이다.
 */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="8" fill="#0a6e5c" />
      <path d="M8 8H24v10a8 8 0 0 1-16 0Z" fill="#7fd0ba" />
      <path d="M24 8h16v10a8 8 0 0 1-16 0Z" fill="#ffffff" />
      <path d="M40 8h16v10a8 8 0 0 1-16 0Z" fill="#7fd0ba" />
      <rect x="8" y="32" width="26" height="6" rx="3" fill="#ffffff" />
      <rect x="8" y="43" width="15" height="6" rx="3" fill="#ffffff" />
      <rect x="38" y="38" width="16" height="16" fill="#7fd0ba" />
      <circle cx="46" cy="38" r="3" fill="#7fd0ba" />
      <circle cx="38" cy="46" r="3" fill="#7fd0ba" />
      <path
        d="M42 46l3.5 3.5 6-8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 서비스 로고. 링크가 아니다 — 누르면 갈 곳이 화면마다 달라서 감싸는 쪽에서 Link 로 덮는다.
 */
export default function BrandLogo({ markOnly = false, className }: BrandLogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className="size-[25px] shrink-0" />

      {markOnly ? (
        <span className="sr-only">소상공인 도우미</span>
      ) : (
        <span className="font-heading text-text text-body1 font-bold">소상공인 도우미</span>
      )}
    </span>
  )
}
