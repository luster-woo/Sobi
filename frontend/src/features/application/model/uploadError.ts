import { getErrorCode, getErrorMessage } from '@/shared/api/errors'

/**
 * 업로드 실패 안내.
 *
 * 서버가 거절하는 이유가 다섯 갈래인데 사용자가 할 일이 저마다 다르다. 하나로 뭉쳐
 * '업로드에 실패했어요' 라고만 하면 기다려야 할지 다른 파일을 골라야 할지 알 수 없다.
 *
 * 특히 VALIDATING 은 실패가 아니다. 앞선 파일을 검사하는 중이라 잠깐 못 바꾸는 것뿐이라,
 * '다시 시도해 주세요' 라고 하면 계속 누르게 된다.
 */
const CODE_MESSAGE: Record<string, string> = {
  APPLICATION_DOCUMENT_VALIDATING: '검증이 끝나면 다시 올릴 수 있어요.',
  APPLICATION_DOCUMENT_UPLOAD_NOT_ALLOWED: '이미 제출한 신청이라 서류를 바꿀 수 없어요.',
  APPLICATION_DOCUMENT_FILE_EMPTY: '파일을 선택해 주세요.',
  APPLICATION_DOCUMENT_FILE_TYPE_INVALID:
    '이 서류가 받지 않는 형식이에요. 확장자만 바꾼 파일도 걸러집니다.',
  APPLICATION_DOCUMENT_FILE_TOO_LARGE: '파일이 너무 커요. 10MB 이하로 올려주세요.',
  APPLICATION_DOCUMENT_NOT_FOUND: '서류를 찾을 수 없어요. 화면을 새로고침해 주세요.',
}

export function uploadErrorMessage(error: unknown): string {
  const code = getErrorCode(error)

  return (
    (code && CODE_MESSAGE[code]) ||
    getErrorMessage(error, { 401: '로그인이 필요해요.' })
  )
}