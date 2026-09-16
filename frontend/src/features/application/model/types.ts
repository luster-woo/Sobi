/**
 * 대출·지원사업 신청 (S15P21D101-189 · 194)
 *
 * 두 화면이 같은 타입을 쓴다. 다른 건 신청 금액뿐이다 — 대출만 금액을 입력받고
 * 지원사업은 지원금이 정해져 있어 받지 않는다.
 *
 * 여기 있는 값은 서버가 주는 값이다. 화면에 그릴 때는 shared/constants/documentStatus
 * 의 UI 상태로 옮겨서 쓴다(model/documentStatus.ts). 서버 값과 UI 상태를 따로 두면
 * 백엔드가 값을 바꿔도 컴포넌트를 안 건드려도 된다.
 *
 * 상태값은 아직 확정 전이다. 확정되면 변경할 것
 */

import type { ApplicationStatus } from '@/shared/types/application'

/**
 * 서류 종류.
 *   SUBMIT  올려서 검증받는 서류
 *   WRITE   화면에서 작성하는 서류 (AI 초안 지원)
 */
export const DOCUMENT_TYPE = {
  SUBMIT: 'SUBMIT',
  WRITE: 'WRITE',
} as const

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE]

/** 올린 파일의 검증 상태. 작성 서류도 올리고 나면 이 축을 탄다 */
export const VALIDATION_STATUS = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  VALIDATING: 'VALIDATING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
} as const

export type ValidationStatus = (typeof VALIDATION_STATUS)[keyof typeof VALIDATION_STATUS]

/** 작성 서류의 초안 생성 상태 */
export const DRAFT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  WRITING: 'WRITING',
  WRITTEN: 'WRITTEN',
} as const

export type DraftStatus = (typeof DRAFT_STATUS)[keyof typeof DRAFT_STATUS]

/**
 * 서류 한 장.
 *
 * 예전에는 documentType 으로 갈리는 판별 유니온이었다. 서버는 그렇게 주지 않는다 —
 * 한 서류에 validationStatus 와 draftStatus 를 둘 다 단다. 작성 서류는 두 축이 다
 * 도는 게 맞다. 초안을 만들고(draftStatus) 사용자가 손봐서 올린 것을 검증한다
 * (validationStatus). 그래서 유니온을 걷어내고 평평한 타입 하나로 둔다.
 *
 * ⚠️ templateUrl · draftUrl 이 없다. 화면의 '빈 서식 받기' · '초안 작성본 받기' 가
 *    그 주소로 파일을 여는데, 어떻게 받는지 아직 정해지지 않았다 (413).
 * ⚠️ issuer(발급처)도 없어졌다. 체크리스트의 '홈택스' 표시가 그 값이었다.
 */
export interface ApplicationDocument {
  /**
   * 미제출이어도 행이 미리 만들어져 있어서 항상 값이 있다.
   * 업로드할 때 이 값을 보낸다 — 그래서 없으면 업로드 자체가 불가능하다.
   */
  applicationDocumentId: number
  /** 서류명. 필수 서류가 삭제돼 연결이 끊기면 null */
  documentName: string | null
  documentType: DocumentType
  validationStatus: ValidationStatus
  /** 검증 실패 사유 */
  validationMessage: string | null
  /** 아직 안 올렸으면 null */
  originalFilename: string | null
  /** 작성 서류만 값이 있다 */
  draftStatus: DraftStatus | null
}

/** 상단 요약 — 대출 */
export interface ApplicationLoanSummary {
  loanId: number
  accountName: string
  bankName: string
  interestRate: number
  minLoanBalance: number
  maxLoanBalance: number
}

/** 상단 요약 — 지원사업 */
export interface ApplicationSupportSummary {
  supportProgramId: number
  programName: string
  /** 소관기관 */
  jurisdiction: string
  /**
   * 지원 형태. '기타' 면 돈이 오가지 않아 금액·계좌 입력란을 숨긴다.
   *
   * ⚠️ 서버가 문자열로 준다. 한글인지 enum 인지 확인이 필요하다.
   */
  supportType: string
  startDate: string | null
  endDate: string | null
  minBalance: number | null
  maxBalance: number | null
}

/**
 * 신청 상세 (서류 제출 페이지).
 *
 * 상품 요약이 loan / support 둘로 갈린다. 신청 종류에 따라 한쪽만 값이 있고,
 * 상품이 지워지면 둘 다 null 이다.
 *
 * applyAmount · accountNo 가 없어졌다. 서버가 금액·계좌를 임시 저장하지 않고
 * 제출할 때만 받기 때문이다 — 입력하다 나가면 값이 사라진다.
 */
export interface ApplicationDetail {
  applicationId: number
  /** 상품·사업이 지워지면 null */
  type: ApplicationSource | null
  status: ApplicationStatus
  rejectReason: string | null
  loan: ApplicationLoanSummary | null
  support: ApplicationSupportSummary | null
  documents: ApplicationDocument[]
  /** 검증을 통과한 서류 수. 서버가 세어 준다 */
  completedCount: number
  totalCount: number
}

/**
 * 신청 대상. 신청 생성의 쿼리 파라미터이자 목록 응답의 type 이다.
 *
 * 서버 enum(ApplicationType)과 같은 값이어야 한다. SUPPORT_PROGRAM 으로 보내면
 * APPLICATION_TYPE_BAD_REQUEST(400) 가 온다 — 테이블 이름이 support_program 이라
 * 헷갈리기 쉬운데 통신에 나가는 값은 SUPPORT 다.
 */
export const APPLICATION_SOURCE = {
  LOAN: 'LOAN',
  SUPPORT: 'SUPPORT',
} as const

export type ApplicationSource = (typeof APPLICATION_SOURCE)[keyof typeof APPLICATION_SOURCE]

/** 신청 생성 */
export interface CreateApplicationParams {
  type: ApplicationSource
  /** loanId 또는 supportProgramId */
  programId: number
}

/**
 * 최종 신청 본문.
 *
 * 금액·계좌를 임시 저장하지 않고 제출할 때만 보낸다.
 * '기타' 지원사업은 돈이 오가지 않아 둘 다 null 이다.
 */
export interface SubmitApplicationBody {
  amount: number | null
  /** account.id. 계좌번호가 아니다 */
  accountId: number | null
}

/**
 * 제출 결과.
 *
 * ⚠️ 제출하면 곧바로 끝난다. 금융망이 신청 즉시 심사 결과를 주고, 지원사업은 심사
 *    없이 바로 지급된다. 그래서 status 는 PAID 아니면 REJECTED 다 —
 *    SUBMITTED · REVIEWING · APPROVED 를 아무도 만들지 않는다.
 *
 * 거절도 200 이다. 오류가 아니라 결과라서 status 로 가른다.
 */
export interface SubmitApplicationResult {
  applicationId: number
  status: ApplicationStatus
  rejectReason: string | null
  amount: number | null
  /** 새로 열린 대출 계좌번호. 대출이 실행됐을 때만 온다 */
  loanAccountNo: string | null
}

/** 서류 업로드. multipart 로 보낸다 */
export interface UploadDocumentParams {
  /** 신청 상세의 documents 에서 가져온다. 미제출 서류도 행이 있어서 값이 있다 */
  applicationDocumentId: number
  file: File
}

/** 출금 계좌 후보. 서버가 입출금(COMMON) 계좌만 걸러서 준다 */
export interface PayoutAccount {
  /** 제출할 때 이 값을 보낸다. 계좌번호로는 지목할 수 없다 */
  accountId: number
  bankName: string
  accountNo: string
}

/**
 * 신청 현황 목록의 한 행
 *
 * 상세(ApplicationDetail)와 따로 둔다. 목록에는 서류가 오지 않고, 대신 화면에 바로
 * 필요한 상품명·기관명이 펼쳐져서 온다.
 */
export interface ApplicationListItem {
  applicationId: number
  /**
   * 카드에 '대출' / '지원금' 으로 표시하고, 어느 도메인 상세로 갈지도 이걸로 가른다.
   *
   * 상품·공고가 DB 에서 지워지면 null 이다(FK 가 ON DELETE SET NULL). 대출은 마감이
   * 없어 행이 계속 남으므로 실제로는 안 나온다. 지원사업은 나중에 만료 공고를
   * 정리하기 시작하면 나올 수 있다 — 그때 화면을 제대로 만든다.
   */
  type: ApplicationSource | null
  /** loanId 또는 supportProgramId. type 과 같은 이유로 null 일 수 있다 */
  programId: number | null
  programName: string | null
  status: ApplicationStatus
  /** 최종 신청 전에는 null. 지원사업은 금액을 입력받지 않아 계속 null */
  amount: number | null
  /** 접수 시각(subject_at). 신청을 만든 시점이라 항상 있다 */
  subjectAt: string
  /** 승인·반려가 확정된 시각(complete_at). 진행 중이면 null. */
  completeAt: string | null
  /** REJECTED 일 때만 채워진다 */
  rejectReason: string | null
}

/**
 * 신청 목록 응답.
 *
 * 페이지네이션이 없다. 한 사람의 신청 건수가 많아야 수십 건이라 서버가 한 번에 준다.
 *
 * inProgressCount·doneCount 는 서버의 2분류(IN_PROGRESS / DONE) 기준이라 화면 탭과
 * 맞지 않는다. 화면은 준비 중을 진행 중에서 떼어 네 갈래로 나누므로 개수도 직접 센다.
 * status 파라미터를 보내지 않고 전체를 받는 이유도 같다.
 */
export interface ApplicationListData {
  totalCount: number
  inProgressCount: number
  doneCount: number
  applications: ApplicationListItem[]
}
