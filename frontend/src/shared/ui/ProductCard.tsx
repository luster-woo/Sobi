import type { ProductStatus } from '@/shared/constants/productStatus'
import { PRODUCT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { cn } from '@/shared/utils/cn'

export interface ProductMetric {
  /** '금리' · '납입 횟수' · '대출 금액' · '지원 금액' · '마감' */
  label: string
  /** 포맷팅이 끝난 표시값. '연 3.4%' · '36회' · '1,000만~7,000만 원' · 'D-10' */
  value: string
}

interface ProductCardProps {
  title: string
  /** 기관명 */
  organization?: string
  /**
   * 표시할 지표. 어떤 항목을 넣을지는 카드가 아니라 부르는 화면이 정합니다.
   * 팀에서 정한 기준(스키마 컬럼 기준)은 이렇습니다.
   *
   *   대출   → 납입 횟수(`loan.period`) · 대출 금액(`min_loan_balance`~`max_loan_balance`)
   *            금리(`interest_rate`)
   *   지원금 → 마감(`support_program.end_date`) · 금리(`interest_rate`)
   *            지원 금액(`min_balance`~`max_balance`)
   *
   * 지원사업에 금리가 있는 건 융자성 사업(이자 지원·보증부)이 섞여 있어서입니다.
   * `support_program.type` 으로 보조금인지 융자인지 갈립니다 — 보조금이면 금리 항목을
   * 넣지 마세요.
   */
  metrics?: ProductMetric[]
  status: ProductStatus
  isBookmarked?: boolean
  /** 없으면 북마크 버튼을 그리지 않습니다 */
  onToggleBookmark?: () => void
  /** 상세로 이동. 없으면 카드가 클릭되지 않습니다 */
  onClick?: () => void
  className?: string
}

/*
 * 와이어프레임이 흑백이라 색은 토큰으로 옮겼습니다. 기준은 "지금 사용자가 뭘 해야 하나".
 *  - POSSIBLE    지금 행동할 수 있는 유일한 상태라 유일하게 채웁니다
 *  - IMPOSSIBLE  점선 + 흐린 글씨. 눌러도 되는 것처럼 보이면 안 됩니다
 *  - WRITING     사용자가 이어서 할 일이 남아 있어 주의색
 *  - SUBMITTED   접수만 된 상태. 할 일이 없어 중립 테두리
 *  - REVIEW      서버(기관)가 처리 중이라 진행색. SUBMITTED 와 같은 색이면 구분이 안 됩니다
 *  - APPROVED    결과가 좋은 상태이되 행동 유도가 아니라서 soft 배경
 */
const statusClass: Record<ProductStatus, string> = {
  POSSIBLE: 'border-primary bg-primary text-text-inverse',
  IMPOSSIBLE: 'border-border-strong text-text-disabled border-dashed',
  WRITING: 'border-warning text-warning',
  SUBMITTED: 'border-border-strong text-text-secondary',
  REVIEW: 'border-progress/30 bg-progress-soft text-progress',
  APPROVED: 'border-primary bg-primary-soft text-primary',
}

/** 상세 화면에서도 쓰게 되면 별도 파일로 빼면 됩니다 */
function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        'text-caption inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-semibold',
        statusClass[status],
      )}
    >
      {PRODUCT_STATUS_LABEL[status]}
    </span>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  )
}

/**
 * 대출·지원사업 공용 상품 카드.
 *
 * 타입(SUPPORT / LOAN / ETC)별로 카드를 나누지 않고 metrics 를 데이터로 받습니다.
 * 세 경우의 골격(제목·기관·지표·배지·북마크·클릭)이 같고 지표 항목만 달라서,
 * 컴포넌트를 쪼개면 북마크 토글과 포커스 처리가 세 벌로 복제됩니다.
 *
 * 도메인 객체를 받지 않는 이유: shared/ui 가 SupportProgramSummary·Loan 을 알게 되면
 * 서버 응답이 바뀔 때마다 공통 컴포넌트가 흔들립니다. 금액 축약·D-day 계산 같은
 * 변환도 각 feature 가 맡고, 카드는 완성된 문자열만 받습니다.
 *
 * 클릭 구조: 카드 전체에 onClick 을 두고 제목만 button 으로 만들어 키보드로 닿게
 * 합니다. 카드를 role="button" 으로 만들면 스크린리더가 카드 전체 텍스트를 버튼
 * 이름으로 읽고, 안의 북마크 버튼이 중첩 인터랙티브 요소가 됩니다.
 */
export default function ProductCard({
  title,
  organization,
  metrics = [],
  status,
  isBookmarked = false,
  onToggleBookmark,
  onClick,
  className,
}: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'border-border bg-surface p-card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border transition-colors',
        onClick && 'hover:border-border-strong cursor-pointer',
        className,
      )}
    >
      <div className="min-w-[180px] flex-1">
        <h3 className="text-h4 text-text">
          {onClick ? (
            <button
              type="button"
              onClick={(event) => {
                // 카드 onClick 과 겹쳐 두 번 불리는 것을 막는다
                event.stopPropagation()
                onClick?.()
              }}
              className="focus-visible:outline-primary text-left focus-visible:outline focus-visible:outline-offset-2"
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h3>

        {organization && <p className="text-body2 text-text-muted mt-1">{organization}</p>}
      </div>

      {metrics.length > 0 && (
        <div className="flex shrink-0 gap-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-[92px]">
              <p className="text-caption text-text-muted">{metric.label}</p>
              <p className="text-body1 text-text mt-0.5 font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <StatusBadge status={status} />

        {onToggleBookmark && (
          <button
            type="button"
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? '관심 목록에서 제거' : '관심 목록에 추가'}
            onClick={(event) => {
              // 북마크 클릭이 상세 이동으로 번지지 않게 막는다
              event.stopPropagation()
              onToggleBookmark?.()
            }}
            className={cn(
              'focus-visible:outline-primary rounded-md p-1 transition-colors focus-visible:outline focus-visible:outline-offset-1',
              isBookmarked ? 'text-text' : 'text-text-disabled hover:text-text-secondary',
            )}
          >
            <BookmarkIcon filled={isBookmarked} />
          </button>
        )}
      </div>
    </div>
  )
}
