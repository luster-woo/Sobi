import { delay, http } from 'msw'

import type { ApplicationSupportSummary } from '@/features/application/model/types'
import type {
  SupportProgramDetail,
  SupportProgramListData,
  SupportProgramListItem,
} from '@/features/support-program/model/types'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { isBookmarked } from '@/mocks/lib/bookmarkStore'
import { fail, ok } from '@/mocks/lib/envelope'
import type { SupportStatus } from '@/shared/constants/productStatus'
import type { SupportProgramType } from '@/shared/types'

const INSTITUTIONS = [
  '중소벤처기업진흥공단',
  '소상공인시장진흥공단',
  '고용노동부',
  '대구광역시',
  '국가상공회의소',
]

/** 여덟 상태가 화면에 한 번씩은 나오게 전부 넣는다 */
const STATUSES: SupportStatus[] = [
  'ELIGIBLE',
  'UNKNOWN',
  'INELIGIBLE',
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'PREPARING',
  'PAID',
]

/**
 * 공고 지역. 서버는 시도 약칭으로 거른다(program_condition.region_sido).
 * business_info.region 의 CHECK 제약과 같은 값이다.
 *
 * '전국' 은 어느 지역을 골라도 결과에 포함된다. 시드에 섞어 두어야 그 동작을
 * 화면에서 눌러볼 수 있다.
 */
const REGIONS = ['전국', '서울', '경기', '부산', '대구', '제주']

/**
 * 공고의 지역. 응답에는 없는 값이라 항목에 담지 않고 id 로 계산한다 —
 * 서버도 region 을 거르는 데만 쓰고 SupportProgramSummaryResponse 에는 안 담는다.
 */
function regionOf(supportProgramId: number): string {
  return REGIONS[supportProgramId % REGIONS.length]
}

const TYPES: SupportProgramType[] = ['SUPPORT', 'LOAN', 'ETC']

/** 오늘로부터 n 일 뒤 날짜 문자열. 마감 임박(빨간색)을 화면에서 보려고 상대값으로 만든다 */
function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * 접수가 끝난 공고. 마지막 하나만 마감으로 둔다.
 *
 * ⚠️ 실서버 목록은 마감 공고를 빼고 준다(SupportServiceImpl). 목이 굳이 보여주는 건
 *    마감 안내(APPLICATION_004)를 화면에서 눌러볼 방법이 그것뿐이어서다 — 목록에서도
 *    빼면 닿을 수 없는 코드가 된다.
 */
const CLOSED_PROGRAM_ID = 27

function makeProgram(index: number): SupportProgramListItem {
  const id = index + 1
  const type = TYPES[index % 3]
  const closed = id === CLOSED_PROGRAM_ID

  const base = {
    supportProgramId: id,
    pblancNm: closed
      ? `${INSTITUTIONS[index % 5]} 소상공인 지원사업 ${id}호 (접수 마감)`
      : `${INSTITUTIONS[index % 5]} 소상공인 지원사업 ${id}호`,
    jrsdInsttNm: INSTITUTIONS[index % 5],
    excInsttNm: '소상공인시장진흥공단',
    // 8개마다 한 번은 상시(마감일 없음)
    startDate: closed ? daysFromNow(-90) : index % 8 === 0 ? null : daysFromNow(-30),
    endDate: closed ? daysFromNow(-1) : index % 8 === 0 ? null : daysFromNow([3, 22, 64, 120][index % 4]),
    // 마감 건은 판정까지 막히면 버튼을 못 눌러 마감 안내에 닿지 못한다
    status: closed ? ('ELIGIBLE' as SupportStatus) : STATUSES[index % STATUSES.length],
    isBookmark: index % 3 === 0,
  }

  /*
   * 서버는 값이 없으면 키를 빼고 준다(@JsonInclude(NON_NULL)). 공고문에 금액·이율이
   * 안 적힌 건이 실제로 있어서 목도 일부를 빼야 화면이 그 경우를 만난다. 항상 채워주면
   * 실서버에서만 터진다 — 이율이 없는 융자형에서 toFixed 로 화면이 죽은 적이 있다.
   */
  const balance =
    index % 7 === 0
      ? {}
      : {
          minBalance: [1_000_000, 3_000_000, 10_000_000][index % 3],
          maxBalance: [5_000_000, 8_000_000, 50_000_000, 100_000_000][index % 4],
        }

  if (type === 'SUPPORT') return { ...base, ...balance, type }
  if (type === 'LOAN') {
    const rate = index % 5 === 0 ? {} : { interestRate: Number((2 + (index % 20) / 10).toFixed(1)) }
    return { ...base, ...balance, type, ...rate }
  }
  return { ...base, type }
}

const mockPrograms: SupportProgramListItem[] = Array.from({ length: 27 }, (_, i) => makeProgram(i))

/**
 * 접수 기간이 지났는지. 신청 목(handlers/application.ts)이 가져간다.
 *
 * 서버는 생성할 때와 제출할 때 각각 검사한다 — 작성하는 사이에 마감될 수 있어서다
 * (ApplicationServiceImpl.validateApplicationPeriod). 시작·마감일이 둘 다 없으면
 * 예산 소진 시 마감이라 열어 둔다.
 */
export function isSupportProgramClosed(supportProgramId: number): boolean {
  const found = mockPrograms.find((program) => program.supportProgramId === supportProgramId)
  if (!found?.endDate) return false

  return found.endDate < new Date().toISOString().slice(0, 10)
}

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
      // ?? null 이 필요하다. 키는 있는데 값이 undefined 인 경우가 생겼다
      minBalance: ('minBalance' in program ? program.minBalance : null) ?? null,
      maxBalance: ('maxBalance' in program ? program.maxBalance : null) ?? null,
      endDate: program.endDate,
      // 융자형(LOAN)에만 이율이 있다
      interestRateOfSP: ('interestRate' in program ? program.interestRate : null) ?? null,
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
    minBalance: (found.type === 'ETC' ? null : found.minBalance) ?? null,
    maxBalance: (found.type === 'ETC' ? null : found.maxBalance) ?? null,
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
    const region = url.searchParams.get('region')
    const judgement = url.searchParams.get('judgement')
    const isBookmark = url.searchParams.get('isBookmark')
    const sort = url.searchParams.get('sort')

    // 사용자가 누른 담기·빼기를 먼저 반영한다. 안 그러면 표의 리본이 시드에 고정된다
    let filtered = mockPrograms.map(withBookmark)
    if (type) filtered = filtered.filter((program) => program.type === type)
    // 전국 공고는 어느 지역을 골라도 남는다. 서버도 같은 규칙이다
    if (region) {
      filtered = filtered.filter((program) => {
        const programRegion = regionOf(program.supportProgramId)
        return programRegion === region || programRegion === '전국'
      })
    }
    if (judgement) filtered = filtered.filter((program) => program.status === judgement)
    if (isBookmark === 'true') filtered = filtered.filter((program) => program.isBookmark)

    if (sort) {
      const [field, direction] = sort.split(',')
      const sign = direction === 'desc' ? -1 : 1
      filtered = [...filtered].sort((a, b) => {
        if (field === 'maxBalance') {
          /*
           * 금액이 없으면 맨 뒤로 보낸다. ETC 는 필드 자체가 없고, 지원금·융자도
           * 공고문에 금액이 안 적혔으면 값이 undefined 다 — 둘을 같이 다룬다.
           */
          const left = ('maxBalance' in a ? a.maxBalance : undefined) ?? -1
          const right = ('maxBalance' in b ? b.maxBalance : undefined) ?? -1
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
      /*
       * 판정 결과. 마이데이터를 연동하지 않았으면 서버가 null·빈 배열을 준다.
       * 가능한 경우에는 따로 설명할 게 없어 사유를 두지 않는다.
       */
      reason:
        found.status === 'INELIGIBLE'
          ? '업종이 공고 대상에 해당하지 않아요.'
          : found.status === 'UNKNOWN'
            ? '공고문에 직접 확인이 필요한 조건이 있어요.'
            : null,
      // 확인 항목이 남아 있는 것이 UNKNOWN 이 나오는 이유다. 짝을 맞춰 둔다
      checkItems:
        found.status === 'UNKNOWN'
          ? [
              '최근 1년 내 같은 지원사업을 받은 적이 없어야 해요',
              '대표자가 만 39세 이하여야 해요',
            ]
          : [],
      benefits: id % 3 === 0 ? ['청년 창업자는 가점이 있어요'] : [],
      // 신청에서 온 상태일 때만 신청 id 가 있다. 목에서는 공고 id 를 그대로 쓴다
      applicationId:
        found.status === 'ELIGIBLE' ||
        found.status === 'UNKNOWN' ||
        found.status === 'INELIGIBLE'
          ? null
          : id,
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

  /*
   * GET /api/v1/support/:supportProgramId/explanation
   *
   * 실제 서버는 처음 한 번 AI 로 만드느라 2~3초가 걸린다. 그 지연이 화면에서
   * 어떻게 보이는지가 이 기능의 핵심이라, 목에서도 일부러 늦춘다.
   * 안 늦추면 스켈레톤이 도는 순간을 개발 중에 한 번도 못 본다.
   */
  http.get('/api/v1/support/:supportProgramId/explanation', async ({ params }) => {
    const id = Number(params.supportProgramId)
    const found = mockPrograms.find((program) => program.supportProgramId === id)
    const path = `/api/v1/support/${id}/explanation`

    if (!found) {
      return fail(404, 'COMMON_001', '공고를 찾을 수 없습니다.', path)
    }

    await delay(2500)

    // 판정이 없으면 서버도 null 을 준다. 그때 화면이 reason 으로 돌아가는지 본다
    const explanation =
      found.status === 'INELIGIBLE'
        ? '사장님 사업장은 서울 마포구에 있는데, 이 공고는 중랑구 관내 사업장만 신청할 수 있어 대상이 아닙니다. ' +
          '이 사업은 업체 정보를 구청 홈페이지와 소상공인연합회 사이트에 게시해 홍보를 지원합니다.'
        : found.status === 'UNKNOWN'
          ? '사업장이 울산 소재인 점은 공고 요건에 맞습니다. 다만 자영업자 고용보험 가입 여부가 사업자 정보에 없어 확인이 필요합니다. ' +
            '이 사업은 고용보험료 납부액의 15%~30%를 3년간 지원합니다.'
          : found.status === 'ELIGIBLE'
            ? '상시근로자가 3명으로 5명 미만 기준을 충족하고, 업종도 지원제외 대상이 아닙니다. ' +
              '이 사업은 키오스크·테이블오더 도입 비용의 70%를 지원합니다.'
            : null

    return ok({ explanation }, '판정 사유 설명 조회 성공', { path })
  }),
]
