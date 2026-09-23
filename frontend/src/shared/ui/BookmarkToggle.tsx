import { useBookmarkToggle } from '@/shared/hooks/useBookmarkToggle'
import type { BookmarkTarget } from '@/shared/types'
import BookmarkButton from '@/shared/ui/BookmarkButton'

interface BookmarkToggleProps {
  programId: number
  type: BookmarkTarget
  /** 서버가 준 현재 상태 */
  bookmarked: boolean
  /** 낭독기가 무엇을 담는지 알아야 한다. 상품명·공고명을 넘긴다 */
  label: string
  className?: string
}

/**
 * 서버에 붙은 관심 목록 버튼.
 *
 * BookmarkButton 은 모양만 그리고 누른 결과를 밖에서 받는다. 관심 목록 화면이 그것을
 * 다른 뮤테이션(useRemoveFavorite)에 물려 쓰기 때문이다 — 거기서는 누르면 줄이
 * 사라져야 해서 낙관적으로 캐시를 지운다. 훅을 BookmarkButton 안에 박으면 그 화면이
 * 깨진다.
 *
 * 이 컴포넌트는 그 위에 useBookmarkToggle 을 얹은 것이다. 목록의 표에서 쓰려면 이
 * 형태여야 한다 — Column.render 는 컴포넌트가 아니라 함수라 훅을 부를 수 없고,
 * 줄 수만큼 훅이 불리면 필터로 줄이 늘고 줄 때마다 개수가 달라져 규칙 위반이다.
 *
 * 줄마다 인스턴스가 하나씩 생기므로 isPending 이 저절로 줄별로 갈린다. 훅 하나를
 * 여러 줄이 나눠 쓰면 한 줄을 눌렀을 때 모든 줄이 눌린 것처럼 보인다.
 *
 * 누르는 동안에는 눌릴 결과를 먼저 보여준다. useBookmarkToggle 이 낙관적 갱신을
 * 하지 않아서(되돌릴 캐시가 네 군데다) 응답을 기다리면 리본이 한 박자 늦게 바뀐다.
 * 상세 모달도 같은 방식으로 처리돼 있다.
 */
export default function BookmarkToggle({
  programId,
  type,
  bookmarked,
  label,
  className,
}: BookmarkToggleProps) {
  const toggle = useBookmarkToggle()
  const shown = toggle.isPending ? toggle.variables.next : bookmarked

  return (
    <BookmarkButton
      bookmarked={shown}
      onToggle={() => toggle.mutate({ programId, type, next: !shown })}
      label={label}
      className={className}
    />
  )
}
