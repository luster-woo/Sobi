import { http, HttpResponse } from 'msw'

import type {
  SupportProgramDetail,
  SupportProgramListData,
  SupportProgramListItem,
} from '@/features/support-program/model/types'
import type { ProductStatus } from '@/shared/constants/productStatus'
import type { ApiResponse, SupportProgramType } from '@/shared/types'

const INSTITUTIONS = [
  '중소벤처기업진흥공단',
  '소상공인시장진흥공단',
  '고용노동부',
  '대구광역시',
  '국가상공회의소',
]

const STATUSES: ProductStatus[] = [
  'POSSIBLE',
  'IMPOSSIBLE',
  'SUBMITTED',
  'REVIEW',
  'APPROVED',
  'WRITING',
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

    let filtered = mockPrograms
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

    const body: ApiResponse<SupportProgramListData> = {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/v1/support',
      message: '지원사업 목록 조회 성공',
      data: {
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
      error: null,
    }

    return HttpResponse.json(body)
  }),

  // POST /api/v1/support/search
  http.post('/api/v1/support/search', async ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 20)
    const { query } = (await request.json()) as { query?: string }

    /*
     * 실제로는 RAG 기반 유사도 검색이다. 목에서는 흉내낼 수 없어 공고명·기관명 부분
     * 일치로 대신한다. 화면 확인용이고, 서버가 붙으면 결과 순서와 개수가 달라진다.
     */
    const keyword = (query ?? '').trim()
    const filtered = keyword
      ? mockPrograms.filter(
          (program) => program.pblancNm.includes(keyword) || program.jrsdInsttNm.includes(keyword),
        )
      : mockPrograms

    const totalElements = filtered.length
    const totalPages = Math.ceil(totalElements / size)

    const body: ApiResponse<SupportProgramListData> = {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '/api/v1/support/search',
      message: '지원사업 자연어 검색 성공',
      data: {
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
      error: null,
    }

    return HttpResponse.json(body)
  }),

  // GET /api/v1/support/:supportProgramId
  http.get('/api/v1/support/:supportProgramId', ({ params }) => {
    const id = Number(params.supportProgramId)
    const found = mockPrograms.find((program) => program.supportProgramId === id)

    if (!found) {
      return HttpResponse.json({ message: '공고를 찾을 수 없습니다' }, { status: 404 })
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
      isBookmark: found.isBookmark,
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

    const body: ApiResponse<SupportProgramDetail> = {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: `/api/v1/support/${id}`,
      message: '지원사업 상세 정보 조회 성공',
      data: detail,
      error: null,
    }

    return HttpResponse.json(body)
  }),
]
