import { http } from 'msw'

import { hasMockSession } from '@/mocks/handlers/auth'
import { bookmarkedLoanRows, findLoanBookmarkState } from '@/mocks/handlers/loan'
import {
  bookmarkedSupportProgramRows,
  findSupportProgramBookmarkState,
} from '@/mocks/handlers/support'
import { type BookmarkKind, setBookmarked } from '@/mocks/lib/bookmarkStore'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 관심 목록 (bookmark) 목 핸들러.
 *
 * ⚠️ 백엔드에 **이미 구현돼 있다.** 실서버 우선 규칙(`lib/serverFirst.ts`)이 있어서
 *    8080 이 떠 있으면 이 목은 자동으로 비켜선다 — 백엔드를 띄울 수 없을 때만 탄다.
 *    그래서 연동이 끝나도 지울 필요가 없다.
 *
 * 담긴 여부는 `lib/bookmarkStore` 가 들고 있고 loan·support 목도 같은 것을 본다.
 * 상세 모달에서 담은 것이 목록 표와 이 화면에 같이 나타나야 하기 때문이다.
 *
 * 상품 데이터를 여기서 만들지 않고 loan·support 목에서 가져오는 이유도 같다. 따로 들면
 * 관심 목록에 뜬 상품을 눌러 상세를 열었을 때 다른 상품이 나온다.
 *
 * ⚠️ 응답의 status 가 `"POSSIBLE"` · `"IMPOSSIBLE"` 이다. 백엔드가 이 API 에서만
 *    `LoanStatus` enum 을 안 쓰고 문자열을 직접 박아 둔 것을 그대로 흉내 낸다 —
 *    프론트의 되돌리는 코드(`features/mypage/api/bookmarks.ts`)를 실제로 태워 봐야
 *    실서버로 바꿔도 안 깨진다.
 */

/**
 * 인증 확인.
 *
 * 목 세션 플래그만 보면 안 된다. 목은 엔드포인트 단위로 빠지므로 로그인은 실서버가 받고
 * 이 요청만 목이 받는 조합이 생기는데, 그때 `msw:logged-in` 은 비어 있다.
 */
function authorized(request: Request) {
  return request.headers.get('Authorization') !== null || hasMockSession()
}

/** `type` 쿼리. 백엔드는 `"LOAN"` · `"SUPPORT"` 만 받고 나머지는 400 이다 */
function toKind(raw: string | null): BookmarkKind | null {
  return raw === 'LOAN' || raw === 'SUPPORT' ? raw : null
}

/**
 * 그 상품·공고가 있는지와 지금 담겨 있는지. 없으면 null.
 *
 * 시드를 여기서 다시 계산하지 않는다 — loan·support 목이 각자 내준다. 두 벌로 적으면
 * 상품을 추가했을 때 목록에는 뜨는데 담으려 하면 404 가 나는 식으로 갈린다.
 */
function lookup(kind: BookmarkKind, programId: number) {
  return kind === 'LOAN'
    ? findLoanBookmarkState(programId)
    : findSupportProgramBookmarkState(programId)
}

/** 경로 변수는 문자열로 온다. 숫자가 아니면 없는 것으로 친다 */
function toProgramId(raw: string | readonly string[] | undefined): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const bookmarkHandlers = [
  /*
   * GET /api/v1/bookmark/me
   *
   * 대출과 지원사업을 두 배열로 나눠 준다. 페이징·정렬 파라미터가 없다 —
   * 컨트롤러가 아무것도 안 받는다.
   *
   * ⚠️ 성공 메시지가 '관심목록 삭제에 성공했습니다.' 다. 백엔드 복붙 실수인데
   *    화면이 이 문구를 읽지 않아 고쳐지기 전까지 그대로 흉내 낸다.
   */
  http.get('/api/v1/bookmark/me', ({ request }) => {
    const path = '/api/v1/bookmark/me'

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    return ok(
      {
        loanList: bookmarkedLoanRows(),
        supportProgramList: bookmarkedSupportProgramRows(),
      },
      '관심목록 삭제에 성공했습니다.',
      { path },
    )
  }),

  /*
   * POST /api/v1/bookmark/{programId}?type=LOAN|SUPPORT
   *
   * 검사 순서를 백엔드와 맞춘다 — `type` 을 먼저 보고(400), 그다음 상품 존재(404),
   * 마지막에 중복(409). 순서가 다르면 잘못된 type 으로 없는 id 를 보냈을 때
   * 화면이 받는 코드가 달라진다.
   */
  http.post('/api/v1/bookmark/:programId', ({ request, params }) => {
    const path = `/api/v1/bookmark/${String(params.programId)}`

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    const kind = toKind(new URL(request.url).searchParams.get('type'))
    if (!kind) return fail(400, 'BOOKMARK_004', '타입 입력이 잘못되었습니다.', path)

    const programId = toProgramId(params.programId)
    const state = programId === null ? null : lookup(kind, programId)

    if (programId === null || !state) {
      return kind === 'LOAN'
        ? fail(404, 'BOOKMARK_001', '해당 id의 대출상품을 찾을 수 없습니다.', path)
        : fail(404, 'BOOKMARK_002', '해당 id의 지원사업을 찾을 수 없습니다.', path)
    }

    // 시드가 이미 담긴 상태일 수 있다. 목록 표에서 채워진 리본을 또 누르는 경우다
    if (state.bookmarked) {
      return fail(409, 'BOOKMARK_003', '이미 관심목록에 등록되어있는 상품/사업입니다.', path)
    }

    setBookmarked(kind, programId, true)

    // 백엔드는 204 가 아니라 200 + `data: null` 로 응답한다
    return ok(null, '관심목록 등록에 성공했습니다.', { path })
  }),

  /*
   * DELETE /api/v1/bookmark/{programId}?type=LOAN|SUPPORT
   *
   * 없는 상품이든 안 담긴 상품이든 백엔드는 똑같이 404 BOOKMARK_005 다 —
   * `deleteBy...` 가 지운 행 수만 세고 상품이 있는지는 안 본다.
   */
  http.delete('/api/v1/bookmark/:programId', ({ request, params }) => {
    const path = `/api/v1/bookmark/${String(params.programId)}`

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    const kind = toKind(new URL(request.url).searchParams.get('type'))
    if (!kind) return fail(400, 'BOOKMARK_004', '타입 입력이 잘못되었습니다.', path)

    const programId = toProgramId(params.programId)
    const state = programId === null ? null : lookup(kind, programId)

    if (programId === null || !state?.bookmarked) {
      return fail(404, 'BOOKMARK_005', '해당 북마크를 찾을 수 없습니다.', path)
    }

    setBookmarked(kind, programId, false)

    return ok(null, '관심목록 삭제에 성공했습니다.', { path })
  }),
]
