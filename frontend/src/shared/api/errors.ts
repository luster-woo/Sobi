import axios from 'axios'

import type { ApiResponse } from '@/shared/types'

export const DEFAULT_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.'

/**
 * 백엔드 에러 코드 (`global/exception/ErrorCode.java`).
 *
 * 상태코드만으로는 안 갈라진다 — 401 하나에 로그인 실패·토큰 만료·미인증이 다 들어온다.
 */
export const ERROR_CODE = {
  /* 공통 */
  INVALID_INPUT_VALUE: 'COMMON_001',
  INTERNAL_SERVER_ERROR: 'COMMON_002',
  USER_NOT_FOUND: 'U001',

  /* 인증 */
  MAIL_SEND_FAILED: 'AUTH_001',
  /** 인증번호 재전송 쿨타임. 429 */
  MAIL_COOLDOWN: 'AUTH_002',
  CODE_EXPIRED: 'AUTH_003',
  CODE_MISMATCH: 'AUTH_004',
  EMAIL_DUPLICATED: 'AUTH_005',
  EMAIL_NOT_VERIFIED: 'AUTH_006',
  INVALID_TOKEN: 'AUTH_007',
  EXPIRED_TOKEN: 'AUTH_008',
  /** 이메일 또는 비밀번호 불일치. 재발급을 걸면 안 되는 401 */
  LOGIN_FAILED: 'AUTH_009',
  UNAUTHORIZED: 'AUTH_010',
  /** resetToken 만료(10분) 또는 이미 사용됨 */
  RESET_TOKEN_INVALID: 'AUTH_011',
  OAUTH_PROVIDER_UNSUPPORTED: 'AUTH_012',
  OAUTH_FAILED: 'AUTH_013',
  OAUTH_ALREADY_LOCAL: 'AUTH_014',
  OAUTH_ALREADY_LINKED: 'AUTH_015',
  OAUTH_EMAIL_MISMATCH: 'AUTH_016',
  /** 소셜 계정은 비밀번호가 없어 변경할 수 없다 (로그인 상태에서의 변경) */
  LOCAL_LOGIN_ONLY: 'AUTH_017',
  /** 소셜 계정은 비밀번호 재설정도 못 한다 — 소셜 로그인으로 유도해야 한다 */
  SOCIAL_RESET_NOT_ALLOWED: 'AUTH_018',

  /* 사업자 */
  BUSINESS_NOT_FOUND: 'BUSINESS_001',
  /** 대표자명·개업일이 국세청 등록 정보와 다름. 화면 06-3 전용 문구 */
  BUSINESS_MISMATCH: 'BUSINESS_002',
  BUSINESS_CODE_NOT_FOUND: 'BUSINESS_003',
  /**
   * 등록된 업체 없음.
   *
   * 한동안 영문 대문자 O 가 섞인 'BUSINESS_O04' 였다. 백엔드가 오타를 고쳐서 지금은
   * 숫자 0 이다 — 옛 값으로 분기하던 코드가 있으면 안 탄다.
   */
  BUSINESS_INFO_NOT_FOUND: 'BUSINESS_004',

  /* 상권 분석 */
  DONG_NOT_FOUND: 'MARKET_001',
  INDUSTRY_NOT_FOUND: 'MARKET_002',
  MARKET_DATA_EMPTY: 'MARKET_003',

  /* 의무보험 */
  /** 없는 항목이거나 **다른 사용자 업체의** 체크리스트 */
  INSURANCE_NOT_FOUND: 'INSURANCE_001',
  /** 현재 상태가 NEEDS_VERIFICATION 이 아님 → 상태 변경 불가 */
  INSURANCE_NOT_CHANGEABLE: 'INSURANCE_002',
  /** REQUIRED / EXEMPT 외의 값을 보냄 */
  INSURANCE_STATUS_INVALID: 'INSURANCE_003',

  /* 마이데이터 */
  /** 업체 등록이 안 됐거나 수집할 대상이 없음. 404 */
  MYDATA_NOT_FOUND: 'MYDATA_001',
  /** 갱신 쿨다운(기본 24시간). 429 */
  MYDATA_REFRESH_COOLDOWN: 'MYDATA_002',

  /* 자금 조합 */
  TARGET_AMOUNT_INVALID: 'FUNDING_001',

  /* 관심 목록 */
  BOOKMARK_LOAN_NOT_FOUND: 'BOOKMARK_001',
  BOOKMARK_SUPPORT_NOT_FOUND: 'BOOKMARK_002',
  BOOKMARK_ALREADY_EXISTS: 'BOOKMARK_003',
  BOOKMARK_TYPE_INVALID: 'BOOKMARK_004',
  /** 담지 않은 것을 해제하려 함. 404 */
  BOOKMARK_NOT_FOUND: 'BOOKMARK_005',

  /* 신청 · 서류 */
  APPLICATION_NOT_FOUND: 'APPLICATION_001',
  /** 같은 상품에 진행 중이거나 지급 완료된 신청이 있다. 409 */
  APPLICATION_ALREADY_IN_PROGRESS: 'APPLICATION_002',
  APPLICATION_TYPE_INVALID: 'APPLICATION_003',
  /** 모집 기간 밖. 생성·제출 두 지점에서 각각 검사한다 — 작성 중에 마감될 수 있다 */
  APPLICATION_PERIOD_CLOSED: 'APPLICATION_004',
  APPLICATION_STATUS_FILTER_INVALID: 'APPLICATION_005',
  APPLICATION_CANCEL_NOT_ALLOWED: 'APPLICATION_006',
  APPLICATION_SUBMIT_NOT_ALLOWED: 'APPLICATION_007',
  APPLICATION_DOCUMENT_NOT_COMPLETED: 'APPLICATION_008',
  APPLICATION_AMOUNT_INVALID: 'APPLICATION_009',
  APPLICATION_ACCOUNT_INVALID: 'APPLICATION_010',
  APPLICATION_NOT_ELIGIBLE: 'APPLICATION_011',
  APPLICATION_DOCUMENT_NOT_FOUND: 'APPLICATION_012',
  APPLICATION_DOCUMENT_UPLOAD_NOT_ALLOWED: 'APPLICATION_013',
  APPLICATION_DOCUMENT_VALIDATING: 'APPLICATION_014',
  APPLICATION_DOCUMENT_FILE_EMPTY: 'APPLICATION_015',
  APPLICATION_DOCUMENT_FILE_TOO_LARGE: 'APPLICATION_016',
  APPLICATION_DOCUMENT_FILE_TYPE_INVALID: 'APPLICATION_017',

  /* 서류 원본·초안 (지원사업 전용) */
  PROGRAM_DOCUMENT_NOT_FOUND: 'DOCUMENT_001',
  DOCUMENT_NOT_WRITABLE: 'DOCUMENT_002',
  DOCUMENT_TEMPLATE_NOT_FOUND: 'DOCUMENT_003',
  /** 채울 정보가 모자라 초안을 만들지 못함. 마이데이터·사업자 정보가 비었을 때 */
  DOCUMENT_DRAFT_NOT_READY: 'DOCUMENT_004',
  DOCUMENT_DRAFT_FILE_NOT_FOUND: 'DOCUMENT_005',
  DOCUMENT_AGENT_REQUEST_FAILED: 'DOCUMENT_006',
  /** 서식 파일이 서버에 아직 안 올라감 */
  DOCUMENT_FILE_NOT_FOUND: 'DOCUMENT_007',
  INVALID_DOCUMENT_PATH: 'DOCUMENT_008',
  DOCUMENT_FILE_READ_FAILED: 'DOCUMENT_009',

  /* 외부 연동 */
  EXTERNAL_API_FAILED: 'EXTERNAL_001',
} as const

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

/** 서버가 보낸 에러 봉투. 네트워크 실패나 봉투가 아니면 null */
function getErrorBody(error: unknown): ApiResponse<null> | null {
  if (!axios.isAxiosError<ApiResponse<null>>(error)) return null

  const data = error.response?.data
  return typeof data?.message === 'string' ? data : null
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/**
 * 백엔드 에러 코드. 코드로 분기할 때 쓴다.
 *
 *   if (getErrorCode(error) === ERROR_CODE.RESET_TOKEN_INVALID) goToStep(1)
 */
export function getErrorCode(error: unknown): string | undefined {
  return getErrorBody(error)?.error?.code
}

/**
 * 화면에 띄울 문구를 고른다. 우선순위는 `overrides` → 서버 message → 공통 문구.
 *
 * 화면마다 같은 상태코드를 다르게 안내해야 해서(401 이 로그인 화면에서는
 * '비밀번호가 틀렸습니다', 다른 화면에서는 '다시 로그인해주세요') 문구 자체는
 * shared 가 정하지 않고 호출한 쪽이 `overrides` 로 넘긴다.
 *
 *   const message = getErrorMessage(error, { 401: '관리자 코드가 올바르지 않습니다.' })
 *
 * 코드별로 갈라야 하면 `getErrorCode` 로 먼저 분기한다.
 */
export function getErrorMessage(error: unknown, overrides?: Record<number, string>): string {
  const status = getErrorStatus(error)

  if (status !== undefined && overrides?.[status]) return overrides[status]
  if (status === undefined && axios.isAxiosError(error)) return NETWORK_ERROR_MESSAGE

  return getErrorBody(error)?.message ?? DEFAULT_ERROR_MESSAGE
}
