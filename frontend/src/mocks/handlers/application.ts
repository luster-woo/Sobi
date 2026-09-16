import { http, HttpResponse } from 'msw'

import { isSettled } from '@/features/application/model/statusLabel'
import type {
  ApplicationDetail,
  ApplicationDocument,
  ApplicationListItem,
  ApplicationProduct,
  SubmitApplicationBody,
  VerifyStatus,
  WriteStatus,
} from '@/features/application/model/types'
import { findLoanProductSummary } from '@/mocks/handlers/loan'
import { findSupportProductSummary } from '@/mocks/handlers/support'
import type { ApiResponse } from '@/shared/types'
import type { ApplicationStatus } from '@/shared/types/application'

/**
 * 대출·지원사업 신청 목 (S15P21D101-189 · 194)
 *
 * 다른 목과 달리 상태를 들고 있다. 업로드하면 서류 상태가 실제로 바뀌고
 * 시간이 지나면 검증이 진행돼야, 비동기 검증을 화면에서 확인할 수 있다.
 *
 * 검증 진행은 타이머가 아니라 업로드 시각으로 계산한다. 타이머를 걸면 MSW 가
 * 재시작될 때 남아서 새고, 조회 시점마다 다시 계산하면 폴링과도 자연스럽게 맞는다.
 *
 * ⚠️ 아직 백엔드 확정 전이다. 요청해 둔 모양(영문 상수 · 미제출 서류 포함 ·
 *    docName)대로 만들었다. 확정되면 이 파일과 model/types.ts 만 고치면 된다.
 */

/** 업로드 후 검증 준비중으로 보이는 구간 */
const PENDING_MS = 1_500
/** 그 뒤 검증 진행중으로 보이는 구간. 이 시간이 지나면 결과가 확정된다 */
const VALIDATING_MS = 5_000
/** AI 가 초안을 만드는 데 걸리는 시간 */
const DRAFTING_MS = 4_000

interface MockDocument {
  applicationDocumentId: number
  docName: string
  issuer: string | null
  documentType: 'VERIFY' | 'WRITE'
  originalFilename: string | null
  /** 업로드 시각(ms). null 이면 미제출 */
  uploadedAt: number | null
  /** 몇 번째 업로드인지. 재업로드 시나리오 판정에 쓴다 */
  attempts: number
  /**
   * 첫 업로드를 반드시 실패시킬 서류.
   * 검증 실패 → 다시 업로드 흐름을 화면에서 확인해야 해서 하나는 실패로 둔다.
   */
  failsFirstAttempt: boolean
  /** 통과했을 때 OCR 이 확인했다고 보여줄 내용 */
  passedDetail: string | null
  /**
   * 시연용으로 상태를 고정한다. 시드 신청 건에만 쓴다 —
   * 화면을 열자마자 검증 중·검증 실패가 어떻게 보이는지 봐야 하는데,
   * 시간 계산에만 맡기면 몇 초 뒤 전부 통과로 바뀌어 버린다.
   */
  frozenStatus: VerifyStatus | null
  /** WRITE 서류 전용 */
  writeStatus: WriteStatus
  templateUrl: string | null
  /** 초안 생성을 요청한 시각(ms). null 이면 요청 전 */
  draftStartedAt: number | null
}

interface MockApplication {
  applicationId: number
  loanId: number | null
  supportProgramId: number | null
  status: ApplicationStatus
  rejectReason: string | null
  applyAmount: number | null
  accountNo: string | null
  product: ApplicationProduct
  documents: MockDocument[]
  createdAt: string
  updatedAt: string
  /**
   * 승인·반려가 확정된 시각(ERD 의 complete_at). 진행 중이면 null.
   *
   * 서버가 추적하는 시각은 접수(subject_at)와 이것 둘뿐이다.
   * 서류 검토·계좌 입금 단계는 언제 지났는지 알 수 없다.
   */
  completeAt: string | null
}

/** 서류 서식. 신청을 만들 때 이걸 복제해서 행을 미리 깔아 둔다 */
type DocumentTemplate = Pick<
  MockDocument,
  'docName' | 'issuer' | 'documentType' | 'failsFirstAttempt' | 'passedDetail' | 'templateUrl'
>

/** 대출 서류. loan_document 를 항내 낸다 */
const LOAN_DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  {
    docName: '부가세 과세표준증명원',
    issuer: '홈택스',
    documentType: 'VERIFY',
    failsFirstAttempt: false,
    passedDetail: '발급일 2026. 08. 20 · 직인 확인 · 필수 필드 완료',
    templateUrl: null,
  },
  {
    docName: '재무제표',
    issuer: '홈택스',
    documentType: 'VERIFY',
    failsFirstAttempt: false,
    passedDetail: '발급일 2026. 07. 31 · 직인 확인 · 필수 필드 완료',
    templateUrl: null,
  },
  {
    docName: '등기부등본',
    issuer: '인터넷등기소',
    documentType: 'VERIFY',
    // 첫 업로드는 실패시킨다. '다시 업로드' 버튼이 실제로 동작하는지 봐야 한다
    failsFirstAttempt: true,
    passedDetail: '발급일 2026. 09. 01 · 인감 도장 확인',
    templateUrl: null,
  },
  {
    docName: '자금 사용 계획서',
    issuer: '화면에서 작성',
    documentType: 'WRITE',
    failsFirstAttempt: false,
    passedDetail: null,
    templateUrl: '/mock/자금사용계획서_서식.hwpx',
  },
  {
    docName: '국세 납세증명서',
    issuer: '홈택스·정부24',
    documentType: 'VERIFY',
    failsFirstAttempt: false,
    passedDetail: '발급일 2026. 09. 10 · 체납 없음',
    templateUrl: null,
  },
]

/**
 * 지원사업 서류. program_document 를 항내 낸다.
 *
 * 대출과 개수도 구성도 다르다 — 검증 3 + 작성 2 다. 화면이 목록을 하드코딩하지 않고
 * 응답대로 그리는지 확인하려면 모양이 달라야 한다.
 */
const SUPPORT_DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  {
    docName: '사업자등록증명원',
    issuer: '홈택스',
    documentType: 'VERIFY',
    failsFirstAttempt: false,
    passedDetail: '발급일 2026. 09. 02 · 업종 일치 · 직인 확인',
    templateUrl: null,
  },
  {
    docName: '국세 납세증명서',
    issuer: '홈택스·정부24',
    documentType: 'VERIFY',
    failsFirstAttempt: true,
    passedDetail: '발급일 2026. 09. 10 · 체납 없음',
    templateUrl: null,
  },
  {
    docName: '지방세 납세증명서',
    issuer: '위택스',
    documentType: 'VERIFY',
    failsFirstAttempt: false,
    passedDetail: '발급일 2026. 09. 08 · 체납 없음',
    templateUrl: null,
  },
  {
    docName: '사업계획서',
    issuer: '화면에서 작성',
    documentType: 'WRITE',
    failsFirstAttempt: false,
    passedDetail: null,
    templateUrl: '/mock/사업계획서_서식.hwpx',
  },
  {
    docName: '개인정보 수집·이용 동의서',
    issuer: '서식 내려받아 서명',
    documentType: 'WRITE',
    failsFirstAttempt: false,
    passedDetail: null,
    templateUrl: '/mock/개인정보동의서_서식.pdf',
  },
]

/** 목에 없는 id 로 신청이 들어왔을 때. 화면이 비는 것보다 낫다 */
const FALLBACK_PRODUCT: ApplicationProduct = {
  name: '알 수 없는 상품',
  organization: null,
  interestRate: null,
  minAmount: null,
  maxAmount: null,
  deadline: null,
}

let nextApplicationId = 13
let nextDocumentId = 200

function createDocuments(templates: readonly DocumentTemplate[]): MockDocument[] {
  return templates.map((template) => ({
    ...template,
    applicationDocumentId: nextDocumentId++,
    originalFilename: null,
    uploadedAt: null,
    attempts: 0,
    frozenStatus: null,
    writeStatus: 'NOT_STARTED',
    draftStartedAt: null,
  }))
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19)
}

/**
 * 시연용 신청 건. 디자인 시안의 상태를 그대로 재현한다.
 * 화면을 만들면서 통과·검증중·실패·미제출을 한 화면에서 다 봐야 한다.
 */
function seedApplication(): MockApplication {
  const documents = createDocuments(LOAN_DOCUMENT_TEMPLATES)

  documents[0].frozenStatus = 'PASSED'
  documents[0].originalFilename = '부가세과세표준증명원.pdf'
  documents[0].attempts = 1

  documents[1].frozenStatus = 'VALIDATING'
  documents[1].originalFilename = '재무제표_2025.pdf'
  documents[1].attempts = 1

  documents[2].frozenStatus = 'FAILED'
  documents[2].originalFilename = '등기부등본.pdf'
  documents[2].attempts = 1

  // documents[3] 자금 사용 계획서 = NOT_STARTED
  // documents[4] 국세 납세증명서 = NOT_SUBMITTED

  return {
    applicationId: 12,
    loanId: 2,
    supportProgramId: null,
    status: 'PREPARING',
    rejectReason: null,
    applyAmount: null,
    accountNo: null,
    // 목록과 같은 데이터를 쓴다. 시드만 따로 놓으면 상세 모달과 어긋난다
    product: findLoanProductSummary(2) ?? FALLBACK_PRODUCT,
    documents,
    createdAt: '2026-09-05T10:20:30',
    updatedAt: '2026-09-07T15:10:12',
    completeAt: null,
  }
}

/**
 * 신청 현황 화면용 시드.
 *
 * 실제로 심사하는 주체가 없어서 상태가 저절로 넘어갈 일이 없다. 화면을 보려면
 * 이미 진행된 건들을 미리 깔아 두는 수밖에 없다. 실서버도 같은 이유로 시드가 필요하다.
 *
 * 상태를 골고루 두어 탭 필터와 스텝퍼 단계를 한 화면에서 다 확인할 수 있게 했다.
 */
function seedTracked(
  applicationId: number,
  source: { loanId: number | null; supportProgramId: number | null },
  status: ApplicationStatus,
  subjectAt: string,
  completeAt: string | null,
  extra: { applyAmount: number | null; rejectReason?: string },
): MockApplication {
  const product =
    source.loanId !== null
      ? (findLoanProductSummary(source.loanId) ?? FALLBACK_PRODUCT)
      : (findSupportProductSummary(source.supportProgramId ?? 0) ?? FALLBACK_PRODUCT)

  return {
    applicationId,
    loanId: source.loanId,
    supportProgramId: source.supportProgramId,
    status,
    rejectReason: extra.rejectReason ?? null,
    applyAmount: extra.applyAmount,
    accountNo: '50812345678',
    product,
    // 제출이 끝난 건이라 서류는 전부 통과로 두고 읽기 전용으로 보인다
    documents: createDocuments(
      source.loanId !== null ? LOAN_DOCUMENT_TEMPLATES : SUPPORT_DOCUMENT_TEMPLATES,
    ).map((doc) => ({
      ...doc,
      originalFilename: `${doc.docName}.pdf`,
      frozenStatus: doc.documentType === 'VERIFY' ? ('PASSED' as const) : null,
      writeStatus: doc.documentType === 'WRITE' ? ('WRITTEN' as const) : doc.writeStatus,
      attempts: 1,
    })),
    createdAt: subjectAt,
    updatedAt: completeAt ?? subjectAt,
    completeAt,
  }
}

const applications = new Map<number, MockApplication>([
  [12, seedApplication()],
  /*
   * 준비중 두 번째 건. 12번은 서류를 올리다 만 상태고, 이쪽은 서류가 다 끝났는데
   * 최종 신청만 안 한 상태다. 둘 다 PREPARING 이라 '준비 중' 탭에서 같이 보인다.
   *
   * 지원사업으로 둔 이유는 '이어서 작성' 이 도메인마다 다른 경로로 가기 때문이다.
   * 12번(대출)만 있으면 /support-programs/apply 쪽을 한 번도 안 지난다.
   */
  [
    107,
    seedTracked(
      107,
      { loanId: null, supportProgramId: 5 },
      'PREPARING',
      '2026-09-14T16:45:00',
      null,
      {
        applyAmount: null,
      },
    ),
  ],
  // 시안의 네 건 + 스텝퍼 중간 단계를 볼 수 있는 두 건
  [
    101,
    seedTracked(
      101,
      { loanId: 2, supportProgramId: null },
      'PAID',
      '2026-08-21T09:12:00',
      '2026-08-29T14:03:00',
      {
        applyAmount: 30_000_000,
      },
    ),
  ],
  [
    102,
    seedTracked(
      102,
      { loanId: null, supportProgramId: 1 },
      'PAID',
      '2026-08-18T11:40:00',
      '2026-08-27T10:05:00',
      {
        applyAmount: null,
      },
    ),
  ],
  [
    103,
    seedTracked(
      103,
      { loanId: null, supportProgramId: 4 },
      'REJECTED',
      '2026-07-30T13:22:00',
      '2026-08-07T16:44:00',
      {
        applyAmount: null,
        rejectReason: '상인회 가입 확인서가 제출되지 않아 반려됐어요.',
      },
    ),
  ],
  [
    104,
    seedTracked(
      104,
      { loanId: 3, supportProgramId: null },
      'SUBMITTED',
      '2026-09-12T10:01:00',
      null,
      {
        applyAmount: 20_000_000,
      },
    ),
  ],
  [
    105,
    seedTracked(
      105,
      { loanId: null, supportProgramId: 7 },
      'REVIEWING',
      '2026-09-08T15:30:00',
      null,
      {
        applyAmount: null,
      },
    ),
  ],
  [
    106,
    seedTracked(
      106,
      { loanId: 1, supportProgramId: null },
      'APPROVED',
      '2026-09-01T09:00:00',
      '2026-09-10T11:20:00',
      {
        applyAmount: 50_000_000,
      },
    ),
  ],
])

/** 업로드 시각으로 검증 단계를 계산한다. 고정된 서류는 그 값을 그대로 쓴다 */
function resolveVerifyStatus(doc: MockDocument): VerifyStatus {
  if (doc.frozenStatus) return doc.frozenStatus
  if (doc.uploadedAt === null) return 'NOT_SUBMITTED'

  const elapsed = Date.now() - doc.uploadedAt
  if (elapsed < PENDING_MS) return 'PENDING'
  if (elapsed < PENDING_MS + VALIDATING_MS) return 'VALIDATING'

  return doc.failsFirstAttempt && doc.attempts === 1 ? 'FAILED' : 'PASSED'
}

function toDocumentResponse(doc: MockDocument): ApplicationDocument {
  const base = {
    applicationDocumentId: doc.applicationDocumentId,
    docName: doc.docName,
    issuer: doc.issuer,
    originalFilename: doc.originalFilename,
  }

  if (doc.documentType === 'WRITE') {
    return {
      ...base,
      documentType: 'WRITE',
      status: doc.writeStatus,
      templateUrl: doc.templateUrl,
      // 생성을 시작한 뒤 일정 시간이 지나야 받을 수 있다. 그 전까지가 '작성 중'
      draftUrl:
        doc.draftStartedAt !== null && Date.now() - doc.draftStartedAt >= DRAFTING_MS
          ? `/mock/${doc.docName}_초안.hwpx`
          : null,
    }
  }

  const status = resolveVerifyStatus(doc)

  return {
    ...base,
    documentType: 'VERIFY',
    status,
    validationMessage: verifyMessage(status, doc),
  }
}

function verifyMessage(status: VerifyStatus, doc: MockDocument): string | null {
  switch (status) {
    case 'VALIDATING':
      return '서명 / 도장 / 발급 유효기간 / 필수 필드를 확인하고 있어요'
    case 'FAILED':
      return '인감 도장이 확인되지 않아요. 날인 후 다시 올려주세요.'
    case 'PASSED':
      return doc.passedDetail
    default:
      return null
  }
}

function toResponse(app: MockApplication): ApplicationDetail {
  return {
    applicationId: app.applicationId,
    loanId: app.loanId,
    supportProgramId: app.supportProgramId,
    status: app.status,
    rejectReason: app.rejectReason,
    applyAmount: app.applyAmount,
    accountNo: app.accountNo,
    product: app.product,
    documents: app.documents.map(toDocumentResponse),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  }
}

function success<T>(path: string, message: string, data: T): ApiResponse<T> {
  return { statusCode: 200, timestamp: nowIso(), path, message, data, error: null }
}

function failure(path: string, message: string, code = 'COMMON_001') {
  return HttpResponse.json(
    { statusCode: 400, timestamp: nowIso(), path, message, data: null, error: { code } },
    { status: 400 },
  )
}

function notFound(path: string) {
  return HttpResponse.json(
    {
      statusCode: 404,
      timestamp: nowIso(),
      path,
      message: '신청 내역을 찾을 수 없습니다.',
      data: null,
      error: { code: 'COMMON_003' },
    },
    { status: 404 },
  )
}

/**
 * 시드의 '검증 중' 서류를 화면을 열 순간부터 진짜로 돌린다.
 *
 * 상태를 계속 고정해 두면 검증이 영영 안 끝나고 화면이 2초마다 무한히 폴링한다.
 * 첫 조회 때 시계를 집어넣어야 '검증 중 → 검증 통과 → 폴링 중단' 까지 눈으로 볼 수 있다.
 */
function awakenSeed(app: MockApplication) {
  for (const doc of app.documents) {
    if (doc.frozenStatus !== 'VALIDATING') continue
    doc.frozenStatus = null
    doc.uploadedAt = Date.now()
  }
}

/**
 * 목록용 변환. 서류는 안 담고 화면에 바로 필요한 것만 펼쳐서 내려준다.
 *
 * 기관명(organization)은 확정 응답에 없어 빠졌다. 카드 부제에서도 함께 지웠다.
 */
function toListItem(app: MockApplication): ApplicationListItem {
  const isLoan = app.loanId !== null

  return {
    applicationId: app.applicationId,
    type: isLoan ? 'LOAN' : 'SUPPORT',
    programId: isLoan ? app.loanId : app.supportProgramId,
    programName: app.product.name,
    status: app.status,
    amount: app.applyAmount,
    subjectAt: app.createdAt,
    completeAt: app.completeAt,
    rejectReason: app.rejectReason,
  }
}

export const applicationHandlers = [
  /**
   * 내 신청 목록.
   *
   * 준비중(PREPARING)도 준다. 예전에는 뺐는데, 그러면 서류를 올리다 중단한 신청서로
   * 돌아갈 길이 없었다. 자금 조합이 한 번에 여러 건을 만들기 시작하면 갈 곳 없는
   * 신청서가 더 늘어난다.
   *
   * status 파라미터(IN_PROGRESS / DONE)를 받지만 화면이 안 보낸다. 화면 탭은 준비 중을
   * 진행 중에서 떼어 네 갈래라 서버의 2분류로는 못 맞춘다. 그래서 목도 거르지 않는다.
   *
   * 개수는 필터 적용 전 전체 기준이다. 서버가 그렇게 준다.
   *
   * 최신 신청이 위로 온다.
   */
  http.get('/api/v1/application', () => {
    const all = [...applications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const inProgressCount = all.filter((app) => !isSettled(app.status)).length

    return HttpResponse.json(
      success('/api/v1/application', '신청 목록 조회에 성공하였습니다.', {
        totalCount: all.length,
        inProgressCount,
        doneCount: all.length - inProgressCount,
        applications: all.map(toListItem),
      }),
    )
  }),

  /**
   * 신청 생성. 서류 행을 미리 다 깔아 둔다 —
   * 업로드 API 가 applicationDocumentId 를 요구하므로 미제출 서류도 id 가 있어야 한다.
   */
  http.post('/api/v1/application', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const programId = Number(url.searchParams.get('programId'))

    if (!type || !programId) {
      return failure('/api/v1/application', '유효하지 않은 요청입니다.')
    }

    const isLoan = type === 'LOAN'
    /*
     * 지원사업은 support 목에서 가져온다. 여기서 따로 들고 있으면 목록에서 고른
     * 공고와 신청 화면의 상품이 어긋난다.
     */
    const product = isLoan
      ? (findLoanProductSummary(programId) ?? FALLBACK_PRODUCT)
      : (findSupportProductSummary(programId) ?? FALLBACK_PRODUCT)

    // 같은 상품에 준비중인 건이 있으면 새로 만들지 않고 그걸 돌려준다
    const existing = [...applications.values()].find(
      (app) =>
        app.status === 'PREPARING' &&
        (isLoan ? app.loanId === programId : app.supportProgramId === programId),
    )
    if (existing) {
      return HttpResponse.json(
        success('/api/v1/application', '이미 진행 중인 신청이 있습니다.', toResponse(existing)),
      )
    }

    const app: MockApplication = {
      applicationId: nextApplicationId++,
      loanId: isLoan ? programId : null,
      supportProgramId: isLoan ? null : programId,
      status: 'PREPARING',
      rejectReason: null,
      applyAmount: null,
      accountNo: null,
      product,
      documents: createDocuments(isLoan ? LOAN_DOCUMENT_TEMPLATES : SUPPORT_DOCUMENT_TEMPLATES),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      completeAt: null,
    }
    applications.set(app.applicationId, app)

    return HttpResponse.json(
      success('/api/v1/application', '신청 목록 테이블이 생성되었습니다.', toResponse(app)),
    )
  }),

  /** 신청 상세. 검증 상태 폴링도 이걸로 받는다 */
  http.get('/api/v1/application/:applicationId', ({ params }) => {
    const id = Number(params.applicationId)
    const app = applications.get(id)
    if (!app) return notFound(`/api/v1/application/${id}`)

    awakenSeed(app)

    return HttpResponse.json(
      success(
        `/api/v1/application/${id}`,
        '신청 목록 상세조회에 성공하였습니다.',
        toResponse(app),
      ) satisfies ApiResponse<ApplicationDetail>,
    )
  }),

  /** 신청 취소. 신청 건과 서류가 함께 사라진다 */
  http.delete('/api/v1/application/:applicationId', ({ params }) => {
    const id = Number(params.applicationId)
    const app = applications.get(id)
    if (!app) return notFound(`/api/v1/application/${id}`)

    if (app.status !== 'PREPARING') {
      return failure(`/api/v1/application/${id}`, '이미 신청이 완료되어 취소할 수 없습니다.')
    }

    applications.delete(id)

    return HttpResponse.json(
      success(`/api/v1/application/${id}`, '신청 목록, 신청 서류가 삭제되었습니다.', null),
    )
  }),

  /** 최종 신청. 서류가 다 끝나야 통과시킨다 */
  http.post('/api/v1/application/finan', async ({ request }) => {
    const body = (await request.json()) as SubmitApplicationBody
    const app = applications.get(body.applicationId)
    if (!app) return notFound('/api/v1/application/finan')

    const remaining = app.documents.filter((doc) =>
      doc.documentType === 'WRITE'
        ? doc.writeStatus !== 'WRITTEN'
        : resolveVerifyStatus(doc) !== 'PASSED',
    )
    if (remaining.length > 0) {
      return failure(
        '/api/v1/application/finan',
        `아직 완료되지 않은 서류가 ${remaining.length}건 있습니다.`,
      )
    }

    // 대출은 금액이 필수고 한도 안에 있어야 한다. 지원사업은 금액 자체가 없다
    if (app.loanId !== null) {
      const amount = body.applyAmount
      if (amount === null || amount === undefined) {
        return failure('/api/v1/application/finan', '신청 금액을 입력해 주세요.')
      }
      // 범위가 없는 상품은 검사할 기준이 없다
      const { minAmount, maxAmount } = app.product
      if (minAmount !== null && maxAmount !== null && (amount < minAmount || amount > maxAmount)) {
        return failure('/api/v1/application/finan', '신청 가능한 금액 범위를 벗어났습니다.')
      }
    }

    if (!body.accountNo) {
      return failure('/api/v1/application/finan', '출금 계좌를 선택해 주세요.')
    }

    app.status = 'SUBMITTED'
    app.applyAmount = body.applyAmount
    app.accountNo = body.accountNo
    app.updatedAt = nowIso()

    return HttpResponse.json(success('/api/v1/application/finan', '신청이 완료되었습니다.', null))
  }),

  /**
   * 제출 서류 업로드.
   *
   * Spring 의 @RequestPart 방식이라 파일과 JSON 이 각각 다른 part 로 온다.
   * JSON part 는 Blob 으로 감싸 보내야 해서 여기서도 text() 로 꺼내 파싱한다.
   */
  http.post('/api/v1/document', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file')
    const rawRequest = formData.get('request')

    if (!(file instanceof File) || !rawRequest) {
      return failure('/api/v1/document', '유효하지 않은 요청입니다.')
    }

    const json = rawRequest instanceof Blob ? await rawRequest.text() : String(rawRequest)
    const { applicationDocumentId } = JSON.parse(json) as { applicationDocumentId: number }

    for (const app of applications.values()) {
      const doc = app.documents.find((d) => d.applicationDocumentId === applicationDocumentId)
      if (!doc) continue

      doc.originalFilename = file.name
      doc.attempts += 1
      app.updatedAt = nowIso()

      if (doc.documentType === 'WRITE') {
        // 작성 서류는 OCR 검증을 하지 않는다. 올리는 순간 통과다
        doc.writeStatus = 'WRITTEN'
      } else {
        doc.uploadedAt = Date.now()
        // 시연용 고정 상태를 풀어야 재업로드가 실제로 진행된다
        doc.frozenStatus = null
      }

      return HttpResponse.json(
        success('/api/v1/document', '제출용 문서 업로드에 성공하였습니다.', null),
      )
    }

    return failure('/api/v1/document', '해당 서류를 찾을 수 없습니다.')
  }),

  /**
   * 작성 서류 초안 생성.
   *
   * 서버가 비동기로 만들고 응답에는 결과가 없다. 시각만 기록해 두면 조회할 때마다
   * 경과 시간으로 완성 여부를 계산한다 — 검증과 같은 방식이다.
   */
  http.post('/api/v1/document/draft', async ({ request }) => {
    const { applicationDocumentId } = (await request.json()) as { applicationDocumentId: number }

    for (const app of applications.values()) {
      const doc = app.documents.find((d) => d.applicationDocumentId === applicationDocumentId)
      if (!doc) continue

      if (doc.documentType !== 'WRITE') {
        return failure('/api/v1/document/draft', '작성 서류가 아닙니다.')
      }

      doc.writeStatus = 'WRITING'
      doc.draftStartedAt = Date.now()
      app.updatedAt = nowIso()

      return HttpResponse.json(success('/api/v1/document/draft', '초안 작성을 시작했습니다.', null))
    }

    return failure('/api/v1/document/draft', '해당 서류를 찾을 수 없습니다.')
  }),
]
