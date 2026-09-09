/**
 * 페이지 번호 축약 로직.
 *
 * ⚠️ 서버(Spring Data)는 page 를 0 부터 세고, 화면에는 1 부터 보여준다.
 *    이 파일과 Pagination 컴포넌트는 **전부 1-base** 로만 다룬다.
 *    0-base 변환은 API 요청을 만드는 쪽에서 toServerPage 로 한 번만 한다.
 *    컴포넌트가 서버 관례를 알면 화면마다 +1/-1 이 흩어져 어긋난다.
 */

export const PAGE_ELLIPSIS = 'ellipsis'

export type PageItem = number | typeof PAGE_ELLIPSIS

interface GetPageItemsParams {
  /** 현재 페이지 (1-base) */
  page: number
  totalPages: number
  /** 현재 페이지 좌우로 함께 보여줄 페이지 수 */
  siblingCount?: number
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function getPageItems({
  page,
  totalPages,
  siblingCount = 1,
}: GetPageItemsParams): PageItem[] {
  if (totalPages <= 0) return []

  // 1 … c-1 c c+1 … N — 생략 없이 다 들어가는 최대 칸 수
  const maxSlots = siblingCount * 2 + 5
  if (totalPages <= maxSlots) return range(1, totalPages)

  const current = Math.min(Math.max(page, 1), totalPages)
  const left = Math.max(current - siblingCount, 1)
  const right = Math.min(current + siblingCount, totalPages)

  // 2번(또는 N-1번) 자리에 '…' 하나만 들어가는 건 낭비라 숫자를 그대로 노출한다
  const hasLeftEllipsis = left > 2
  const hasRightEllipsis = right < totalPages - 1

  /*
   * 칸 수를 항상 maxSlots 로 유지한다. 페이지를 옮길 때 버튼 개수가 달라지면
   * '다음' 버튼 위치가 흔들려서 연달아 누를 수 없다.
   */
  const edgeCount = siblingCount * 2 + 3

  if (!hasLeftEllipsis) return [...range(1, edgeCount), PAGE_ELLIPSIS, totalPages]
  if (!hasRightEllipsis) return [1, PAGE_ELLIPSIS, ...range(totalPages - edgeCount + 1, totalPages)]
  return [1, PAGE_ELLIPSIS, ...range(left, right), PAGE_ELLIPSIS, totalPages]
}

/** 화면(1-base) → 서버(0-base). API 요청을 만들 때만 쓴다 */
export const toServerPage = (page: number) => page - 1

/** 서버(0-base) → 화면(1-base) */
export const toUiPage = (serverPage: number) => serverPage + 1
