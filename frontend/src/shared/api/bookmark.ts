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

/** `GET /bookmark/me` 에서 id 만 뽑는 데 필요한 만큼. 나머지 필드는 읽지 않는다 */
interface BookmarkIdsResponse {
  loanList: { loanId: number }[] | null
  supportProgramList: { supportProgramId: number }[] | null
}

export interface BookmarkedIds {
  loan: Set<number>
  support: Set<number>
}

/**
 * 담아둔 것의 id 만.
 *
 * 대시보드가 쓴다. `GET /dashboard` 응답에 북마크 여부가 없어서(백엔드 `DashboardResponse`
 * 에 필드 자체가 없다) 리본의 초기 상태를 그릴 근거가 없는데, 관심 목록을 한 번 받아
 * 대조하면 백엔드를 고치지 않고도 맞출 수 있다.
 *
 * ⚠️ 관심 목록 화면(`getBookmarks`)과 같은 엔드포인트를 두 번 부른다. 쓰는 모양이 달라서
 *    (저쪽은 표를 그릴 전체 필드, 이쪽은 id 집합) 키를 나눴다. 서버가 `isBookmark` 를
 *    대시보드 응답에 실어 주면 이 조회는 통째로 사라진다.
 */
export async function getBookmarkedIds(): Promise<BookmarkedIds> {
  const { data } = await api.get<BookmarkIdsResponse>(endpoints.bookmark.me)

  return {
    loan: new Set((data.loanList ?? []).map((loan) => loan.loanId)),
    support: new Set((data.supportProgramList ?? []).map((program) => program.supportProgramId)),
  }
}
