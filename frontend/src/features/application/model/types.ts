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
 * 서류 종류. 이 값이 status 집합을 가르는 판별자다.
 *   VERIFY  올려서 OCR 검증을 받는 서류
 *   WRITE   화면에서 작성하는 서류 (AI 초안 지원)
 */
export const DOCUMENT_TYPE = {
  VERIFY: 'VERIFY',
  WRITE: 'WRITE',
} as const

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE]

/** VERIFY 서류의 상태 */
export const VERIFY_STATUS = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  VALIDATING: 'VALIDATING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
} as const

export type VerifyStatus = (typeof VERIFY_STATUS)[keyof typeof VERIFY_STATUS]

/** WRITE 서류의 상태 */
export const WRITE_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  WRITING: 'WRITING',
  WRITTEN: 'WRITTEN',
} as const

export type WriteStatus = (typeof WRITE_STATUS)[keyof typeof WRITE_STATUS]

interface DocumentBase {
  /**
   * 미제출이어도 행이 미리 만들어져 있어서 항상 값이 있다.
   * 업로드할 때 이 값을 보낸다 — 그래서 없으면 업로드 자체가 불가능하다.
   */
  applicationDocumentId: number
  /** 서류명. '국세 납세증명서'. 업로드한 파일명(originalFilename)과 다르다 */
  docName: string
  /** 발급처. '홈택스', '인터넷등기소'. 서버가 못 주면 null 로 두고 줄을 생략한다 */
  issuer: string | null
  /** 아직 안 올렸으면 null */
  originalFilename: string | null
}

/**
 * documentType 이 판별자다. 이걸로 좁히면 status 집합도 같이 좁혀져서,
 * 작성 서류에서 실수로 FAILED 를 비교하는 코드는 컴파일되지 않는다.
 */
export type ApplicationDocument =
  | (DocumentBase & {
      documentType: typeof DOCUMENT_TYPE.VERIFY
      status: VerifyStatus
      /** 실패면 사유, 통과면 OCR 이 확인한 내용. 없으면 null */
      validationMessage: string | null
    })
  | (DocumentBase & {
      documentType: typeof DOCUMENT_TYPE.WRITE
      status: WriteStatus
      /** 빈 서식 내려받기 주소 */
      templateUrl: string | null
      /**
       * 서버가 만든 초안 내려받기 주소.
       *
       * WRITING 이 두 구간을 겸한다 — 초안을 만드는 중과 사용자가 그걸 손보는 중.
       * 이 값이 차면 생성이 끝난 것이라, 폴링을 멈출지 여부도 이걸로 가른다.
       */
      draftUrl: string | null
    })

/**
 * 화면 상단 요약. 상세 API 를 또 부르지 않으려고 신청 응답에 같이 받는다.
 *
 * 대출과 지원사업이 한 타입을 쓴다. 지원사업은 금리·금액이 없는 종류(ETC)가 있어서
 * name 말고는 전부 없을 수 있다. 없으면 안 그린다.
 */
export interface ApplicationProduct {
  name: string
  /** 기관명. 대출이면 은행, 지원사업이면 주관기관 */
  organization: string | null
  /**
   * 연 이율(%). 0 이면 무상, null 이면 금리 개념이 없는 상품이다.
   * 0 과 null 을 구분해야 한다 — 0 을 '연 0%' 로 쓰면 이상하고 무상은 알려야 한다.
   */
  interestRate: number | null
  /**
   * 신청 가능 금액 범위.
   *
   * 대출은 이 범위로 입력값을 검증한다. 지원사업은 금액을 입력받지 않아서 표시용이고,
   * 금액 개념이 없는 공고는 둘 다 null 이다.
   */
  minAmount: number | null
  maxAmount: number | null
  /** 접수 마감일(YYYY-MM-DD). 대출은 마감이 없어서 null 이다 */
  deadline: string | null
}

export interface ApplicationDetail {
  applicationId: number
  /** 대출이면 loanId 가, 지원사업이면 supportProgramId 가 찬다. 둘 중 하나만 */
  loanId: number | null
  supportProgramId: number | null
  status: ApplicationStatus
  rejectReason: string | null
  /** 대출만 입력받는다. 지원사업은 항상 null */
  applyAmount: number | null
  /** 출금 계좌. 아직 안 고르면 null */
  accountNo: string | null
  product: ApplicationProduct
  documents: ApplicationDocument[]
  createdAt: string
  updatedAt: string
}

/**
 * 신청 대상. 쿼리 파라미터로 붙인다.
 *
 * ⚠️ 명세는 소문자(loan/support)인데 다른 API 는 전부 대문자 상수라 통일을 요청했다.
 *    소문자로 확정되면 값만 바꾸면 된다.
 */
export const APPLICATION_SOURCE = {
  LOAN: 'LOAN',
  SUPPORT_PROGRAM: 'SUPPORT_PROGRAM',
} as const

export type ApplicationSource = (typeof APPLICATION_SOURCE)[keyof typeof APPLICATION_SOURCE]

/** 신청 생성 */
export interface CreateApplicationParams {
  type: ApplicationSource
  /** loanId 또는 supportProgramId */
  programId: number
}

/** 최종 신청. 지원사업이면 applyAmount 는 null */
export interface SubmitApplicationBody {
  applicationId: number
  applyAmount: number | null
  /**
   * 계좌번호로 가리킨다. GET /v1/account/list 가 id 없이 {bankName, accountNo} 만
   * 주고, 상환 관리도 accountNo 로 계좌를 지목한다.
   */
  accountNo: string
}

/** 서류 업로드. multipart 로 보낸다 */
export interface UploadDocumentParams {
  /** 신청 상세의 documents 에서 가져온다. 미제출 서류도 행이 있어서 값이 있다 */
  applicationDocumentId: number
  file: File
}

/** 출금 계좌 후보. 서버가 입출금(COMMON) 계좌만 걸러서 준다 */
export interface PayoutAccount {
  bankName: string
  accountNo: string
}
