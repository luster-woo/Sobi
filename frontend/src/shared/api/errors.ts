import axios from 'axios'

import type { ApiResponse, FieldError } from '@/shared/types'

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
  /** 등록된 업체 없음. ⚠️ 숫자 0 이 아니라 **영문 대문자 O** — 백엔드 오타 */
  BUSINESS_INFO_NOT_FOUND: 'BUSINESS_O04',

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

  /* 자금 조합 */
  TARGET_AMOUNT_INVALID: 'FUNDING_001',

  /* 관심 목록 */
  BOOKMARK_LOAN_NOT_FOUND: 'BOOKMARK_001',
  BOOKMARK_SUPPORT_NOT_FOUND: 'BOOKMARK_002',
  BOOKMARK_ALREADY_EXISTS: 'BOOKMARK_003',
  BOOKMARK_TYPE_INVALID: 'BOOKMARK_004',

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

/**
 * 필드 단위 검증 실패.
 *
 * ⚠️ 백엔드가 안 준다 — 검증 실패를 COMMON_001 하나로 뭉쳐서 항상 빈 배열이다.
 *    필드별 안내는 `shared/utils/validators.ts` 로 화면에서 막는다.
 */
export function getFieldErrors(error: unknown): FieldError[] {
  const { errors } = (getErrorBody(error) ?? {}) as { errors?: FieldError[] }
  return Array.isArray(errors) ? errors : []
}
