import { cn } from '@/shared/utils/cn'

interface SpinnerProps {
  /** 지름(px). 화면 전체 로딩은 48, 버튼·인라인은 16~20 */
  size?: number
  /** 선 두께(px). 기본값은 size 에 비례해 계산합니다 */
  thickness?: number
  /** 화면 낭독기가 읽을 문구 */
  label?: string
  /**
   * 옆에 같은 뜻의 텍스트가 이미 있을 때 true.
   * role·aria-label 을 떼고 aria-hidden 을 붙여서, 화면 낭독기가 같은 내용을
   * 두 번 읽지 않게 합니다. ('로딩 중, 작성 중' → '작성 중')
   */
  decorative?: boolean
  className?: string
}

/**
 * 원형 로딩 표시.
 *
 * 회색 링 위에 위쪽 한 조각만 primary 로 칠하고 회전시켜 arc 처럼 보이게 합니다.
 * SVG 대신 border 로 만든 이유는 크기·두께를 숫자 두 개로 조절할 수 있어서입니다.
 *
 * 진행률을 아는 작업에는 쓰지 마세요. 그건 ProgressBar 의 몫입니다.
 * 들어올 내용의 모양을 아는 자리에는 Skeleton 이 낫습니다 (레이아웃이 안 튐).
 */
export default function Spinner({
  size = 48,
  thickness,
  label = '로딩 중',
  decorative = false,
  className,
}: SpinnerProps) {
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        'border-border border-t-primary inline-block animate-spin rounded-full',
        // 접근성 설정에서 애니메이션을 줄인 사용자에게는 회전을 멈춥니다
        'motion-reduce:animate-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderWidth: thickness ?? Math.max(2, Math.round(size / 12)),
      }}
    />
  )
}
