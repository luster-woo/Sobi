import axios from 'axios'

import type { ApiErrorBody, FieldError } from '@/shared/types'

export const DEFAULT_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.'

/** 서버가 보낸 에러 바디. 네트워크 실패나 다른 형태의 응답이면 null */
function getErrorBody(error: unknown): ApiErrorBody | null {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return null

  const data = error.response?.data
  return typeof data?.message === 'string' ? data : null
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/**
 * 화면에 띄울 문구를 고른다. 우선순위는 `overrides` → 서버 message → 공통 문구.
 *
 * 화면마다 같은 상태코드를 다르게 안내해야 해서(401 이 로그인 화면에서는
 * '비밀번호가 틀렸습니다', 다른 화면에서는 '다시 로그인해주세요') 문구 자체는
 * shared 가 정하지 않고 호출한 쪽이 `overrides` 로 넘긴다.
 *
 *   const message = getErrorMessage(error, { 401: '관리자 코드가 올바르지 않습니다.' })
 */
export function getErrorMessage(error: unknown, overrides?: Record<number, string>): string {
  const status = getErrorStatus(error)

  if (status !== undefined && overrides?.[status]) return overrides[status]
  if (status === undefined && axios.isAxiosError(error)) return NETWORK_ERROR_MESSAGE

  return getErrorBody(error)?.message ?? DEFAULT_ERROR_MESSAGE
}

/** 필드 단위 검증 실패. 폼에서 각 입력 밑에 붙일 때 쓴다 */
export function getFieldErrors(error: unknown): FieldError[] {
  return getErrorBody(error)?.errors ?? []
}
