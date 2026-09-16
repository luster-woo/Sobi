import { http } from 'msw'

import type { ApplicationSupportSummary } from '@/features/application/model/types'
import type {
  SupportProgramDetail,
  SupportProgramListData,
  SupportProgramListItem,
} from '@/features/support-program/model/types'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { isBookmarked } from '@/mocks/lib/bookmarkStore'
import { fail, ok } from '@/mocks/lib/envelope'
import type { ProductStatus } from '@/shared/constants/productStatus'
import type { SupportProgramType } from '@/shared/types'

const INSTITUTIONS = [
  '중소벤처기업진흥공단',
  '소상공인시장진흥공단',
  '고용노동부',
  '대구광역시',
  '국가상공회의소',
]

const STATUSES: ProductStatus[] = [
  'ELIGIBLE',
  'INELIGIBLE',
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'PREPARING',
]

const TYPES: SupportProgramType[] = ['SUPPORT', 'LOAN', 'ETC']

/** 오늘로부터 n 일 뒤 날짜 문자열. 마감 임박(빨간색)을 화면에서 보려고 상대값으로 만든다 */
function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function makeProgram(index: number): SupportProgramListItem {
  const id = index + 1
  const type = TYPES[index % 3]

  const base = {
    supportProgramId: id,
    pblancNm: `${INSTITUTIONS[index % 5]} 소상공인 지원사업 ${id}호`,
    jrsdInsttNm: INSTITUTIONS[index % 5],
    excInsttNm: '소상공인시장진흥공단',
    // 8개마다 한 번은 상시(마감일 없음)
    startDate: index % 8 === 0 ? null : daysFromNow(-30),
    endDate: index % 8 === 0 ? null : daysFromNow([3, 22, 64, 120][index % 4]),
    status: STATUSES[index % 6],
    isBookmark: index % 3 === 0,
  }

  const balance = {
    minBalance: [1_000_000, 3_000_000, 10_000_000][index % 3],
    maxBalance: [5_000_000, 8_000_000, 50_000_000, 100_000_000][index % 4],
  }

  if (type === 'SUPPORT') return { ...base, ...balance, type }
  if (type === 'LOAN') {
    return { ...base, ...balance, type, interestRate: Number((2 + (index % 20) / 10).toFixed(1)) }
  }
  return { ...base, type }
}

const mockPrograms: SupportProgramListItem[] = Array.from({ length: 26 }, (_, i) => makeProgram(i))

/** 시드 값에 사용자가 누른 것을 덮어쓴다. 목록·상세·관심 목록이 같은 값을 보게 한다 */
function withBookmark(program: SupportProgramListItem): SupportProgramListItem {
  return {
    ...program,
    isBookmark: isBookmarked('SUPPORT', program.supportProgramId, program.isBookmark),
  }
}

/** 대출 쪽 `findLoanBookmarkState` 와 같은 용도. 그쪽 주석 참고 */
export function findSupportProgramBookmarkState(
  supportProgramId: number,
): { bookmarked: boolean } | null {
  const found = mockPrograms.find((program) => program.supportProgramId === supportProgramId)
  return found ? { bookmarked: withBookmark(found).isBookmark } : null
}

/**
 * 관심 목록에 담긴 지원사업. 관심 목록 목(handlers/bookmark.ts)이 가져간다.
 *
 * 필드 이름이 `GET /support` 와 다르다 — 백엔드 `bookmark/dto/SupportProgramList` 는
 * 이율을 `interestRate` 가 아니라 **`interestRateOfSP`** 로 보낸다. 그 어긋남까지
 * 흉내 내야 프론트 변환 코드가 실제로 검증된다.
 *
 * `type` 이 빠져 있는 것도 실제와 같다. 그래서 관심 목록에서는 지원사업 태그를 못 붙인다.
 *
 * ⚠️ status 는 `"POSSIBLE"` · `"IMPOSSIBLE"` 이다. 대출 쪽과 같은 이유 — 그쪽 주석 참고.
 */
export function bookmarkedSupportProgramRows() {
  return mockPrograms
    .filter((program) => withBookmark(program).isBookmark)
    .map((program) => ({
      supportProgramId: program.supportProgramId,
      pblancNm: program.pblancNm,
      jrsdInsttNm: program.jrsdInsttNm,
      // ETC 유형은 금액이 아예 없다. 공고에 안 적힌 건을 흉내 내는 자리이기도 하다
      minBalance: 'minBalance' in program ? program.minBalance : null,
      maxBalance: 'maxBalance' in program ? program.maxBalance : null,
      endDate: program.endDate,
      // 융자형(LOAN)에만 이율이 있다
      interestRateOfSP: 'interestRate' in program ? program.interestRate : null,
      status:
        program.status === 'ELIGIBLE'
          ? 'POSSIBLE'
          : program.status === 'INELIGIBLE'
            ? 'IMPOSSIBLE'
            : program.status,
    }))
}

/**
 * 신청 화면 상단에 쓸 상품 요약. 신청 목(handlers/application.ts)이 가져간다.
 *
 * 두 목이 따로 데이터를 들면 목록에서 고른 공고와 신청 화면의 상품이 어긋난다.
 *
 * type 별로 값이 있고 없다.
 *   SUPPORT  무상 지원금 — 금액 범위 있음
 *   LOAN     융자 — 금액 범위 있음
 *   ETC      그 외 — 돈이 오가지 않아 금액이 없다. 그래서 신청 화면이 금액·계좌를 숨긴다
 */
export function findSupportProductSummary(
  supportProgramId: number,
): ApplicationSupportSummary | null {
  const found = mockPrograms.find((program) => program.supportProgramId === supportProgramId)
  if (!found) return null

  return {
    supportProgramId: found.supportProgramId,
    programName: found.pblancNm,
    jurisdiction: found.jrsdInsttNm,
    supportType: SUPPORT_PROGRAM_TYPE_LABEL[found.type],
    startDate: found.startDate,
    endDate: found.endDate,
    minBalance: found.type === 'ETC' ? null : found.minBalance,
    maxBalance: found.type === 'ETC' ? null : found.maxBalance,
  }
}

/**
 * 지원사업 (support) 목 핸들러.
 *
 * 실제 응답 형태(봉투 + page 객체)를 그대로 흉내낸다. 서버로 바꿀 때 화면과 훅을 안 고친다.
 *
 * ⚠️ sort 값 형식이 명세에 없어 'endDate,asc' 같은 Spring 형식으로 가정했다.
 */
export const supportHandlers = [
  // GET /api/v1/support
  http.get('/api/v1/support', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 20)
    const type = url.searchParams.get('type')
    const jrsdInsttNm = url.searchParams.get('jrsdInsttNm')
    const judgement = url.searchParams.get('judgement')
    const isBookmark = url.searchParams.get('isBookmark')
    const sort = url.searchParams.get('sort')

    // 사용자가 누른 담기·빼기를 먼저 반영한다. 안 그러면 표의 리본이 시드에 고정된다
    let filtered = mockPrograms.map(withBookmark)
    if (type) filtered = filtered.filter((program) => program.type === type)
    if (jrsdInsttNm) filtered = filtered.filter((program) => program.jrsdInsttNm === jrsdInsttNm)
    if (judgement) filtered = filtered.filter((program) => program.status === judgement)
    if (isBookmark === 'true') filtered = filtered.filter((program) => program.isBookmark)

    if (sort) {
      const [field, direction] = sort.split(',')
      const sign = direction === 'desc' ? -1 : 1
      filtered = [...filtered].sort((a, b) => {
        if (field === 'maxBalance') {
          // ETC 는 금액이 없어 맨 뒤로 보낸다
          const left = 'maxBalance' in a ? a.maxBalance : -1
          const right = 'maxBalance' in b ? b.maxBalance : -1
          return (left - right) * sign
        }
        // 상시(마감일 없음)는 급할 게 없으니 맨 뒤로 보낸다
        const left = a.endDate ?? '9999-12-31'
        const right = b.endDate ?? '9999-12-31'
        return left.localeCompare(right) * sign
      })
    }

    const totalElements = filtered.length
    const totalPages = Math.ceil(totalElements / size)

    return ok<SupportProgramListData>(
      {
        programs: filtered.slice(page * size, page * size + size),
        page: {
          number: page,
          size,
          totalElements,
          totalPages,
          first: page === 0,
          last: page >= totalPages - 1,
        },
      },
      '지원사업 목록 조회 성공',
      { path: '/api/v1/support' },
    )
  }),

  // POST /api/v1/support/search
  http.post('/api/v1/support/search', async ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 20)
    const { query } = (await request.json()) as { query?: string }

    // 실제는 RAG 유사도 검색. 목은 공고명·기관명 부분일치로 대신한다
    const keyword = (query ?? '').trim()
    const filtered = keyword
      ? mockPrograms.filter(
          (program) => program.pblancNm.includes(keyword) || program.jrsdInsttNm.includes(keyword),
        )
      : mockPrograms

    const totalElements = filtered.length
    const totalPages = Math.ceil(totalElements / size)

    return ok<SupportProgramListData>(
      {
        programs: filtered.slice(page * size, page * size + size),
        page: {
          number: page,
          size,
          totalElements,
          totalPages,
          first: page === 0,
          last: page >= totalPages - 1,
        },
      },
      '지원사업 자연어 검색 성공',
      { path: '/api/v1/support/search' },
    )
  }),

  // GET /api/v1/support/:supportProgramId
  http.get('/api/v1/support/:supportProgramId', ({ params }) => {
    const id = Number(params.supportProgramId)
    const found = mockPrograms.find((program) => program.supportProgramId === id)

    if (!found) {
      // 지원사업 도메인은 백엔드 미구현이라 전용 에러 코드가 없다. 확정되면 교체
      return fail(404, 'COMMON_001', '공고를 찾을 수 없습니다.', `/api/v1/support/${id}`)
    }

    // 목록에 없는 필드(개요·신청방법·문의처)는 여기서 만든다
    const detailBase = {
      pblancNm: found.pblancNm,
      bsnsSumryCn:
        '키오스크·테이블오더 도입 비용의 70%를 지원해요. 상시근로자 5인 미만 소상공인이 대상이에요.',
      jrsdInsttNm: found.jrsdInsttNm,
      excInsttNm: found.excInsttNm,
      startDate: found.startDate,
      endDate: found.endDate,
      status: found.status,
      isBookmark: withBookmark(found).isBookmark,
      reqstMthPapersCn: '온라인 접수 혹은 팩스를 통해 접수',
      refrncNm: '스마트상점전문기관 1600-6185',
    }

    const detail: SupportProgramDetail =
      found.type === 'ETC'
        ? { ...detailBase, type: 'ETC' }
        : found.type === 'LOAN'
          ? {
              ...detailBase,
              type: 'LOAN',
              minBalance: found.minBalance,
              maxBalance: found.maxBalance,
              interestRate: found.interestRate,
            }
          : {
              ...detailBase,
              type: 'SUPPORT',
              minBalance: found.minBalance,
              maxBalance: found.maxBalance,
            }

    return ok(detail, '지원사업 상세 정보 조회 성공', { path: `/api/v1/support/${id}` })
  }),
]
