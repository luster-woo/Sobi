import type { ProductStatus } from '@/shared/constants/productStatus'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import { cn } from '@/shared/utils/cn'

export interface ProductHighlight {
  /** 숫자 앞의 작은 말. '금리' · '최대' · '1인당' */
  label: string
  /** 큰 숫자. '2.0%' · '720' */
  value: string
  /** 숫자 뒤에 작게 붙는 단위. '만 원'. 금리처럼 값에 단위가 붙어 있으면 생략 */
  unit?: string
}

interface ProductCardProps {
  title: string
  /** 기관명 */
  organization?: string
  /**
   * 카드에서 제일 큰 값. 대출은 금리, 지원금은 지원 금액이다.
   * 시안이 카드마다 큰 숫자를 하나만 두므로 배열이 아니라 단수다.
   */
  highlight: ProductHighlight
  /**
   * 아래 작은 조건들. '시설자금' · '교육 수료 필요' · '납입횟수 36회'
   *
   * 좌우로 벌어지고 넘치면 다음 줄로 내려간다. 개수를 제한하지 않는 대신 카드 높이가
   * 늘어나므로, 부르는 쪽에서 3개 정도로 맞추는 것이 좋다.
   */
  meta?: string[]
  status: ProductStatus
  /** 대출은 LOAN_STATUS_LABEL, 지원사업은 SUPPORT_STATUS_LABEL */
  statusLabels: Record<ProductStatus, string>
  /**
   * 마감 임박 표시. 있으면 상태 배지 대신 이것을 빨갛게 그린다.
   *
   * 시안에서 D-5 카드는 '가능' 배지가 없고 D-5 만 있다. 배지 자리가 하나뿐이라 둘 중
   * 급한 것을 고르는 것이고, 급한 쪽은 남은 날짜다. 밀려난 상태는 버튼이 대신 말한다.
   */
  urgentLabel?: string
  /** 하단 버튼 문구. '신청' · '상세'. 없으면 버튼을 그리지 않는다 */
  actionLabel?: string
  onAction?: () => void
  isBookmarked?: boolean
  /** 없으면 북마크 버튼을 그리지 않는다 */
  onToggleBookmark?: () => void
  /** 카드·제목 클릭 시 상세로 */
  onClick?: () => void
  /** 폭은 카드가 정하지 않는다. CardStrip 이 넘긴다 */
  className?: string
}

/**
 * 대출·지원사업 공용 상품 카드 (시안의 .fcard).
 *
 * 대시보드 가로 스트립에 들어간다. 목록 화면은 표(Table)를 쓰므로 사실상 대시보드
 * 전용이다.
 *
 * 폭을 스스로 정하지 않는다. h-full 만 두고 크기는 CardStrip 이 정하는데, 그래야 같은
 * 줄의 카드 높이가 제목 길이와 무관하게 맞는다. 큰 숫자를 mt-auto 로 밀어내는 것도
 * 같은 이유 — 카드마다 숫자 위치가 어긋나면 금리를 비교할 수가 없다.
 *
 * 도메인 객체를 받지 않는다. shared/ui 가 LoanListItem 을 알게 되면 서버 응답이
 * 바뀔 때마다 공통 컴포넌트가 흔들린다. 금액 축약·D-day 계산은 각 feature 가 한다.
 *
 * 11px·21px 같은 값은 토큰에 없다. 211에서 정한 타이포 6단이 12px 에서 끊기는데 이
 * 카드가 그보다 작은 글자를 쓴다. 카드 하나에만 나오는 크기라 토큰을 늘리지 않았다.
 */
export default function ProductCard({
  title,
  organization,
  highlight,
  meta,
  status,
  statusLabels,
  urgentLabel,
  actionLabel,
  onAction,
  isBookmarked = false,
  onToggleBookmark,
  onClick,
  className,
}: ProductCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'border-border bg-surface flex h-full flex-col gap-[9px] rounded-md border px-3 py-[11px] transition-colors',
        onClick ? 'hover:border-border-strong cursor-pointer' : '',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          {onClick ? (
            <button
              type="button"
              onClick={(event) => {
                // 카드 onClick 과 겹쳐 두 번 불리는 것을 막는다
                event.stopPropagation()
                onClick()
              }}
              className="text-body2 text-text focus-visible:outline-primary line-clamp-2 block w-full text-left leading-snug font-medium focus-visible:outline focus-visible:outline-offset-2"
            >
              {title}
            </button>
          ) : (
            <b className="text-body2 text-text line-clamp-2 block leading-snug font-medium">
              {title}
            </b>
          )}

          {organization && (
            <span className="text-text-muted mt-0.5 block truncate text-[11px]">
              {organization}
            </span>
          )}
        </span>

        {urgentLabel ? (
          <Badge variant="danger">{urgentLabel}</Badge>
        ) : (
          <ProductStatusBadge status={status} labels={statusLabels} />
        )}
      </div>

      {/* 카드마다 큰 숫자의 높이를 맞추려고 여기서 아래로 민다 */}
      <p className="mt-auto flex items-baseline gap-1.5">
        <span className="text-text-muted text-[11px]">{highlight.label}</span>
        <strong className="text-text text-[21px] leading-none font-bold tracking-tight tabular-nums">
          {highlight.value}
          {highlight.unit && (
            <span className="text-text-secondary text-[11.5px] font-normal">{highlight.unit}</span>
          )}
        </strong>
      </p>

      {meta && meta.length > 0 && (
        <div className="border-border-subtle text-text-secondary flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 border-t pt-2 text-[11px] tabular-nums">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}

      {(actionLabel || onToggleBookmark) && (
        <div className="flex items-center justify-between gap-2">
          {actionLabel && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(event) => {
                event.stopPropagation()
                onAction?.()
              }}
            >
              {actionLabel}
            </Button>
          )}

          {onToggleBookmark && (
            <button
              type="button"
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? '관심 목록에서 제거' : '관심 목록에 추가'}
              onClick={(event) => {
                // 북마크 클릭이 상세 이동으로 번지지 않게 막는다
                event.stopPropagation()
                onToggleBookmark()
              }}
              className={cn(
                'focus-visible:outline-primary flex shrink-0 rounded p-0.5 transition-colors focus-visible:outline focus-visible:outline-offset-1',
                isBookmarked ? 'text-primary' : 'text-text-disabled hover:text-text-secondary',
              )}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-[15px]"
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              >
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </article>
  )
}
