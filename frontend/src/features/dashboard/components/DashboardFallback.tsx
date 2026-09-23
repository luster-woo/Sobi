import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Spinner from '@/shared/ui/Spinner'

interface DashboardFallbackProps {
  isError: boolean
  onRetry: () => void
  /** 원인을 아는 실패에만 넘긴다. 없으면 일반 문구 */
  description?: string
}

export default function DashboardFallback({
  isError,
  onRetry,
  description = '잠시 후 다시 시도해주세요.',
}: DashboardFallbackProps) {
  if (!isError) {
    return (
      <div className="flex w-full justify-center py-24">
        <Spinner label="대시보드를 불러오는 중" />
      </div>
    )
  }

  return (
    <EmptyState
      className="w-full"
      title="대시보드를 불러오지 못했어요"
      description={description}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      }
    />
  )
}
