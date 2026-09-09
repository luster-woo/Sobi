import type { ComponentProps } from 'react'

import type { ProductStatus } from '@/shared/constants/productStatus'
import Badge from '@/shared/ui/Badge'

// TODO: 나중에 서류 작성창에서 사용하는 Badge도 shared/ui에 있는 공용 뱃지들로 교체

/** Badge 가 Variant 타입을 export 하지 않아 props 에서 꺼낸다. 변형이 늘면 자동으로 따라간다 */
type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>

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

/*
 * 리디자인 시안(화면흐름-리디자인.html)의 배지 사용을 세어서 맞춘 표다.
 *   bdg-go   채운 초록  → '가능' 16회, '검증 통과', '실행 완료'
 *   bdg-mid  회색       → '신청 완료' 8회, '검증 중', '보유 중'
 *   bdg-no   회색 테두리 → '불가' 6회, '미제출', '대기'
 *   bdg-warn 빨강       → '검증 실패', '반려', '미가입', 'D-3' 등 마감 임박
 *
 * '가능' 만 채운다. 지금 행동할 수 있는 유일한 상태라 다른 것과 무게가 같으면 안 된다.
 * '보유 중' 과 '신청 완료' 는 이미 끝났거나 기다리는 상태라 강조하지 않는다.
 *
 * ⚠️ IMPOSSIBLE 은 시안이 회색 테두리(bdg-no)로 쓰지만, 눈에 띄게 하자는 요청으로
 *    빨강(danger)으로 뒀다. 시안대로 돌리려면 'outline' 으로 바꾸면 된다.
 */
const statusVariant: Record<ProductStatus, BadgeVariant> = {
  POSSIBLE: 'success',
  IMPOSSIBLE: 'danger',
  WRITING: 'neutral',
  SUBMITTED: 'neutral',
  REVIEW: 'neutral',
  APPROVED: 'neutral',
}

export default function ProductStatusBadge({ status, labels, className }: ProductStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]} className={className}>
      {labels[status]}
    </Badge>
  )
}
