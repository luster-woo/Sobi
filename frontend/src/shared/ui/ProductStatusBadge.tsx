import type { LoanStatus, SupportStatus } from '@/shared/constants/productStatus'
import { PRODUCT_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import Badge from '@/shared/ui/Badge'

interface ProductStatusBadgeProps<S extends LoanStatus | SupportStatus> {
  status: S
  /**
   * 상태 → 문구. 대출은 LOAN_STATUS_LABEL, 지원사업은 SUPPORT_STATUS_LABEL 을 넘긴다.
   *
   * 기본값을 두지 않는 이유: APPROVED 가 대출에서 '승인', 지원사업에서 '선정' 이다.
   * 기본값이 있으면 안 넘겨도 컴파일이 되고, 한쪽 문구가 다른 화면에 조용히 새어 나온다.
   */
  labels: Record<S, string>
  className?: string
}

/**
 * 자금 상품 상태 배지.
 *
 * 값 집합이 도메인마다 다르다 — 지원사업에만 UNKNOWN 이 있다. 그래서 상태 타입을
 * 제네릭으로 받는다. 이러면 대출 화면에 지원사업 라벨을 넘기는 실수가 컴파일에서 걸린다.
 *
 * 색은 statusBadge.ts 의 표를 그대로 쓴다. 여기서 다시 정하면 같은 '심사 중' 이
 * 화면마다 다른 색으로 나온다.
 */
export default function ProductStatusBadge<S extends LoanStatus | SupportStatus>({
  status,
  labels,
  className,
}: ProductStatusBadgeProps<S>) {
  return (
    <Badge variant={PRODUCT_STATUS_VARIANT[status]} className={className}>
      {labels[status]}
    </Badge>
  )
}
