import OrDivider from '@/features/auth/components/OrDivider'
import Button from '@/shared/ui/Button'
import { cn } from '@/shared/utils/cn'

interface PreOwnerBranchCardProps {
  /**
   * inline 인증 전·성공 시 카드 안에 붙는 대안 버튼
   * panel  인증 실패·휴폐업처럼 사업자로 못 가는 상황에서 카드 밖에 붙는 안내
   */
  variant: 'inline' | 'panel'
  onStart: () => void
  /** panel 전용. 상황에 따라 문구가 달라진다 */
  title?: string
  description?: string
  className?: string
}

/**
 * 예비 창업자로 시작하는 갈림길.
 *
 * `POST /business` 를 호출하지 않는 것이 곧 예비 창업자다 — role 을 바꾸는 API 가 따로 없고
 * `users.role` 은 업체 등록 여부로 갈린다. 그래서 이 버튼은 등록을 건너뛰고 대시보드로 보낸다.
 *
 * 인증 실패·휴폐업 사용자에게도 이 경로가 유일한 출구라, 막다른 길이 생기지 않게
 * 두 상황 모두에서 보여준다.
 */
export default function PreOwnerBranchCard({
  variant,
  onStart,
  title = '사업자 인증이 어렵다면',
  description = '인증 없이 예비 창업자로 시작하고, 나중에 다시 인증할 수 있어요.',
  className,
}: PreOwnerBranchCardProps) {
  if (variant === 'inline') {
    return (
      <div className={className}>
        <OrDivider />
        <Button variant="outline" onClick={onStart} className="w-full">
          예비 창업자로 시작하기
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border-border bg-surface flex flex-wrap items-center justify-between gap-3.5 rounded-md border px-3.5 py-3.5',
        className,
      )}
    >
      <div className="min-w-0">
        <b className="text-body2 text-text block font-medium">{title}</b>
        <span className="text-caption text-text-secondary mt-0.5 block">{description}</span>
      </div>

      <Button variant="outline" size="sm" onClick={onStart} className="shrink-0 whitespace-nowrap">
        예비 창업자로 시작
      </Button>
    </div>
  )
}
