import axios from 'axios'

import { DEFAULT_ERROR_MESSAGE, ERROR_CODE } from '@/shared/api/errors'
import type { ApiResponse } from '@/shared/types'

/**
 * 파일 요청이 실패했을 때의 안내.
 *
 * responseType 이 blob 이라 **실패 응답의 JSON 도 Blob 으로 도착한다.** 그래서
 * getErrorCode 를 그대로 쓸 수 없다 — error.response.data 가 객체가 아니라 Blob 이라
 * error.code 를 읽지 못하고 조용히 undefined 가 된다.
 *
 * Blob.text() 가 Promise 라 이 함수만 비동기다. 부르는 쪽에서 await 해야 한다.
 */
const CODE_MESSAGE: Record<string, string> = {
  [ERROR_CODE.PROGRAM_DOCUMENT_NOT_FOUND]: '서류 정보를 찾을 수 없어요. 화면을 새로고침해 주세요.',
  [ERROR_CODE.DOCUMENT_NOT_WRITABLE]: '초안을 만들 수 있는 서류가 아니에요.',
  /*
   * 공고 서식을 AI 가 아직 분석하지 못한 상태다. 사용자가 기다린다고 풀리지 않아서
   * 빈 서식을 직접 받아 쓰도록 안내한다.
   */
  [ERROR_CODE.DOCUMENT_TEMPLATE_NOT_FOUND]:
    '이 서류는 아직 자동 작성을 지원하지 않아요. 빈 서식을 받아 작성해 주세요.',
  [ERROR_CODE.DOCUMENT_DRAFT_NOT_READY]:
    '초안을 채울 정보가 부족해요. 마이데이터 연동과 사업자 정보를 먼저 확인해 주세요.',
  [ERROR_CODE.DOCUMENT_DRAFT_FILE_NOT_FOUND]: '초안 파일을 만들지 못했어요. 다시 시도해 주세요.',
  [ERROR_CODE.DOCUMENT_AGENT_REQUEST_FAILED]:
    '문서 작성 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  [ERROR_CODE.DOCUMENT_FILE_NOT_FOUND]: '등록된 서식 파일이 없어요. 담당 기관에 문의해 주세요.',
  [ERROR_CODE.INVALID_DOCUMENT_PATH]:
    '서식 파일 경로가 올바르지 않아요. 담당 기관에 문의해 주세요.',
  [ERROR_CODE.DOCUMENT_FILE_READ_FAILED]: '서식 파일을 읽지 못했어요. 잠시 후 다시 시도해 주세요.',
}

/** Blob 으로 온 봉투를 풀어 코드를 꺼낸다. 봉투가 아니면 null */
async function readErrorCode(error: unknown): Promise<string | null> {
  if (!axios.isAxiosError(error)) return null

  const data = error.response?.data
  if (!(data instanceof Blob)) return null

  try {
    const body = JSON.parse(await data.text()) as ApiResponse<null>
    return body.error?.code ?? null
  } catch {
    // 파일 요청이 JSON 이 아닌 것으로 실패했다. 네트워크 단절 등
    return null
  }
}

export async function downloadErrorMessage(error: unknown): Promise<string> {
  /*
   * 타임아웃을 먼저 가른다. 초안은 최대 5분이라 네트워크 오류와 구분해 줘야 한다 —
   * 배포에서 nginx 가 60초에 끊으면 여기로 온다.
   */
  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return '초안 만들기가 시간 안에 끝나지 않았어요. 잠시 후 다시 시도해 주세요.'
  }

  const code = await readErrorCode(error)
  if (code && CODE_MESSAGE[code]) return CODE_MESSAGE[code]

  if (axios.isAxiosError(error) && error.response?.status === 401) return '로그인이 필요해요.'

  return DEFAULT_ERROR_MESSAGE
}
