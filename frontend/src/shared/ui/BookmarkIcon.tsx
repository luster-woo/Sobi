import { cn } from '@/shared/utils/cn'

interface BookmarkIconProps {
  /** 저장된 상태면 채워서 그린다. 아니면 테두리만 */
  filled: boolean
  className?: string
}

/**
 * 북마크 리본. 관심 목록·대출 목록·지원사업 목록이 같은 모양을 쓴다.
 *
 * 컴포넌트로 뺀 이유: 세 화면이 각자 인라인 svg 를 들고 있었고 path 가 서로 달라서
 * (관심 목록은 아래가 파인 리본, 목록 표는 삼각으로 파인 리본) 같은 '저장' 이 화면마다
 * 다른 그림이었다. 열 정의 파일(loanColumns·supportColumns)은 컴포넌트를 export 하면
 * fast refresh 규칙에 걸려서 직접 정의할 수도 없다.
 *
 * aria-hidden 이다. 뜻은 바깥의 버튼 aria-label 이나 셀 문맥이 전달한다.
 */
export default function BookmarkIcon({ filled, className }: BookmarkIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-4', className)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}
