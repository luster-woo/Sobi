import Badge from '@/shared/ui/Badge'
import BookmarkButton from '@/shared/ui/BookmarkButton'
import { cn } from '@/shared/utils/cn'

interface ProductCardProps {
  title: string
  /** 기관명 */
  organization?: string
  /**
   * 제목 아래 알약 조건.
   *   대출   ['기간 365일']
   *   지원금 ['~9.29', '금리 2.0%']
   *
   * 개수를 제한하지 않지만 236px 카드에 두 줄까지가 한계다. 부르는 쪽에서 2개 정도로
   * 맞추는 것이 좋다.
   */
  chips?: string[]
  /** 카드 아래 금액. '1,000만 원 ~ 1억 원' */
  amount: string
  isBookmarked: boolean
  onToggleBookmark: () => void
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
 * 상태 배지(가능·D-5)를 두지 않는다. 스트립 제목이 '지원 가능한 대출' 이라 목록에
 * 담긴 것은 이미 전부 신청 가능한 것들이고, 카드마다 '가능' 을 붙이면 아무것도
 * 구분해주지 않는 배지가 20개 생긴다. 그 자리는 즐겨찾기가 쓴다 — 카드에서 사용자가
 * 실제로 할 수 있는 유일한 동작이다.
 *
 * 하단 '신청' 버튼도 없다. 카드를 누르면 상세가 열리고 신청은 거기서 시작한다.
 * 208px 카드에 버튼을 넣으면 카드를 눌러도 되는지 버튼을 눌러야 하는지 헷갈린다.
 *
 * 폭을 스스로 정하지 않는다. h-full 만 두고 크기는 CardStrip 이 정하는데, 그래야 같은
 * 줄의 카드 높이가 제목 길이와 무관하게 맞는다. 금액을 mt-auto 로 밀어내는 것도
 * 같은 이유 — 카드마다 금액 위치가 어긋나면 비교할 수가 없다.
 *
 * 도메인 객체를 받지 않는다. shared/ui 가 LoanListItem 을 알게 되면 서버 응답이
 * 바뀔 때마다 공통 컴포넌트가 흔들린다. 금액 축약·D-day 계산은 각 feature 가 한다.
 */
export default function ProductCard({
  title,
  organization,
  chips,
  amount,
  isBookmarked,
  onToggleBookmark,
  onClick,
  className,
}: ProductCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'border-border bg-surface flex h-full flex-col gap-2 rounded-md border px-3.5 py-2.5 transition-colors',
        onClick ? 'hover:border-border-strong cursor-pointer' : '',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1">
          {onClick ? (
            <button
              type="button"
              onClick={(event) => {
                // 카드 onClick 과 겹쳐 두 번 불리는 것을 막는다
                event.stopPropagation()
                onClick()
              }}
              className="text-body2 text-text focus-visible:outline-primary line-clamp-2 block w-full text-left leading-snug font-semibold focus-visible:outline focus-visible:outline-offset-2"
            >
              {title}
            </button>
          ) : (
            <b className="text-body2 text-text line-clamp-2 block leading-snug font-semibold">
              {title}
            </b>
          )}

          {organization && (
            <span className="text-text-muted mt-1 block truncate text-[11.5px]">
              {organization}
            </span>
          )}
        </span>

        {/* 상세 모달과 같은 버튼을 쓴다. 모양이 갈리면 같은 기능인지 알아보기 어렵다 */}
        <BookmarkButton
          bookmarked={isBookmarked}
          onToggle={onToggleBookmark}
          label={title}
          className="-mt-0.5 -mr-1"
        />
      </div>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip}>{chip}</Badge>
          ))}
        </div>
      )}

      {/* 카드마다 금액 높이를 맞추려고 여기서 아래로 민다 */}
      <p className="border-border-subtle text-text text-body2 mt-auto border-t pt-2.5 font-medium tabular-nums">
        {amount}
      </p>
    </article>
  )
}
