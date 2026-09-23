/**
 * 관심 목록 담김 여부를 목 세 군데가 같이 본다.
 *
 * 왜 따로 빼는가: `POST /bookmark/{id}` 를 받는 곳(handlers/bookmark.ts)과 그 결과를
 * 보여주는 곳(handlers/loan.ts 의 `bookmarked`, handlers/support.ts 의 `isBookmark`)이
 * 다른 파일이다. 각자 상태를 들면 상세 모달에서 담은 것이 목록 표에 안 나타난다.
 *
 * handlers 가 아니라 lib 에 두는 이유는 순환 참조 때문이다. bookmark 핸들러는 목록을
 * 만들려고 loan·support 의 시드를 가져다 쓰는데, 저장소까지 거기 있으면
 * loan → bookmark → loan 이 된다.
 *
 * sessionStorage 를 쓰는 건 `handlers/insurance.ts` 와 같은 방침이다 — 새로고침해도
 * 유지되지만 탭을 닫으면 시드로 돌아가서 흐름을 몇 번이고 다시 볼 수 있다.
 */

/** 백엔드 `type` 쿼리가 받는 값. `SUPPORT_PROGRAM` 이 아니라 `SUPPORT` 다 */
export type BookmarkKind = 'LOAN' | 'SUPPORT'

const KEY = 'msw:bookmarks'

/**
 * 시드와 **다른 것만** 담는다. 전체 상태를 통째로 저장하지 않는 이유: 시드가 바뀌면
 * (상품이 추가되거나 `index % 3` 이 달라지면) 저장된 쪽이 낡은 목록을 고정해 버린다.
 */
function overrides(): Record<string, boolean> {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
    return typeof saved === 'object' && saved !== null ? (saved as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

/** 대출 21번과 지원사업 21번이 겹치지 않게 유형을 섞는다 */
function keyOf(kind: BookmarkKind, programId: number) {
  return `${kind}-${programId}`
}

/** 시드 값에 사용자가 누른 것을 덮어쓴 결과 */
export function isBookmarked(kind: BookmarkKind, programId: number, seed: boolean): boolean {
  return overrides()[keyOf(kind, programId)] ?? seed
}

export function setBookmarked(kind: BookmarkKind, programId: number, value: boolean) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...overrides(), [keyOf(kind, programId)]: value }))
  } catch {
    // 사생활 보호 모드·용량 초과. 저장만 못 할 뿐 요청은 성공으로 두는 게 낫다
    console.warn('[MSW] 관심 목록을 저장하지 못했습니다. 새로고침하면 되돌아갑니다.')
  }
}
