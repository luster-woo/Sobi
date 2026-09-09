import type { ProductStatus } from '@/shared/constants/productStatus'
import { PRODUCT_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import Badge from '@/shared/ui/Badge'

// TODO: 나중에 서류 작성창에서 사용하는 Badge도 shared/ui에 있는 공용 뱃지들로 교체

interface ProductStatusBadgeProps {
  status: ProductStatus
  /**
   * 상태 → 문구. 대출은 LOAN_STATUS_LABEL, 지원사업은 SUPPORT_STATUS_LABEL 을 넘긴다.
   *
   * 기본값을 두지 않는 이유: APPROVED 가 대출에서 '보유중', 지원사업에서 '선정' 이다.
   * 기본값이 있으면 안 넘겨도 컴파일이 되고, 한쪽 문구가 다른 화면에 조용히 새어 나온다.
   */
  labels: Record<ProductStatus, string>
  className?: string
}

/**
 * 자금 상품 상태 배지.
 *
 * 색은 shared/constants/statusBadge.ts 의 PRODUCT_STATUS_VARIANT 를 그대로 쓴다.
 * 여기서 다시 정의하면 같은 '검토 중' 이 화면마다 다른 색으로 나온다.
 *
 * 이 컴포넌트가 하는 일은 라벨을 도메인별로 갈라 받는 것뿐이다. 색은 상태만 보면
 * 정해지지만 문구는 대출·지원사업이 달라서 그 부분만 바깥에서 받는다.
 */
export default function ProductStatusBadge({ status, labels, className }: ProductStatusBadgeProps) {
  return (
    <Badge variant={PRODUCT_STATUS_VARIANT[status]} className={className}>
      {labels[status]}
    </Badge>
  )
}
