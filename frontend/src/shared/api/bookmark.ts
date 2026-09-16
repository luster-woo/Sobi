import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { BookmarkTarget } from '@/shared/types'

/**
 * 담기·빼기가 공통으로 받는 것.
 *
 * ⚠️ `type` 없이 부르면 안 된다. programId 가 대출 id 와 지원사업 id 를 겸해서,
 *    21번 대출을 담으려다 21번 지원사업이 담길 수 있다.
 */
export interface BookmarkVariables {
  programId: number
  type: BookmarkTarget
}

/**
 * 관심 목록에 담는다.
 *
 * 조회(`getBookmarks`)와 달리 `shared` 에 두었다. 부르는 곳이 셋이다 —
 * 대출 상세 모달 · 지원사업 상세 모달 · 관심 목록. 어느 한 feature 에 두면
 * 나머지 둘이 그 feature 를 import 하게 된다.
 *
 * 실패는 세 갈래다.
 *   - 404 BOOKMARK_001·002 — 없는 상품·공고
 *   - 409 BOOKMARK_003 — 이미 담겨 있음
 *   - 400 BOOKMARK_004 — `type` 이 LOAN·SUPPORT 가 아님
 */
export async function addBookmark({ programId, type }: BookmarkVariables) {
  await api.post(endpoints.bookmark.add(programId), null, { params: { type } })
}

/**
 * 관심 목록에서 뺀다.
 *
 * 담기지 않은 것을 빼면 404 BOOKMARK_005 다. 화면에 담긴 것으로 보이는데 404 가 나면
 * 손에 든 목록이 낡았다는 뜻이라, 실패해도 목록을 다시 받아와야 한다.
 */
export async function removeBookmark({ programId, type }: BookmarkVariables) {
  await api.delete(endpoints.bookmark.remove(programId), { params: { type } })
}
