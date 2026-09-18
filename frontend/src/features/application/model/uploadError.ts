import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'

/**
 * 업로드 실패 안내.
 *
 * 서버가 거절하는 이유가 다섯 갈래인데 사용자가 할 일이 저마다 다르다. 하나로 뭉쳐
 * '업로드에 실패했어요' 라고만 하면 기다려야 할지 다른 파일을 골라야 할지 알 수 없다.
 *
 * 특히 VALIDATING 은 실패가 아니다. 앞선 파일을 검사하는 중이라 잠깐 못 바꾸는 것뿐이라,
 * '다시 시도해 주세요' 라고 하면 계속 누르게 된다.
 *
 * ⚠️ 키는 ErrorCode 의 **코드**(APPLICATION_014)지 enum 이름이 아니다. 봉투가
 *    error.code 로 코드를 준다 — 이름으로 적으면 한 건도 안 맞고 조용히 서버 기본
 *    문구로 떨어진다. 목은 이름을 내보내서 목에서만 맞는 상태였다.
 */
const CODE_MESSAGE: Record<string, string> = {
  [ERROR_CODE.APPLICATION_DOCUMENT_VALIDATING]: '검증이 끝나면 다시 올릴 수 있어요.',
  [ERROR_CODE.APPLICATION_DOCUMENT_UPLOAD_NOT_ALLOWED]:
    '이미 제출한 신청이라 서류를 바꿀 수 없어요.',
  [ERROR_CODE.APPLICATION_DOCUMENT_FILE_EMPTY]: '파일을 선택해 주세요.',
  /*
   * ⚠️ 한시적 문구. 서버 SIGNATURES 가 아직 pdf·png·jpg·jpeg 뿐이라 작성 서류에
   *    한글·워드를 올려도 이 코드가 온다(ApplicationDocumentServiceImpl.extensionOf).
   *    AI 쪽은 hwp·hwpx·doc·docx 를 이미 다루므로 서버에 시그니처가 추가되면
   *    '확장자만 바꾼 파일도 걸러집니다.' 로 되돌린다.
   */
  [ERROR_CODE.APPLICATION_DOCUMENT_FILE_TYPE_INVALID]:
    '이 서류가 받지 않는 형식이에요. 한글·워드 파일은 아직 PDF 로 변환해 올려주세요.',
  [ERROR_CODE.APPLICATION_DOCUMENT_FILE_TOO_LARGE]: '파일이 너무 커요. 10MB 이하로 올려주세요.',
  [ERROR_CODE.APPLICATION_DOCUMENT_NOT_FOUND]: '서류를 찾을 수 없어요. 화면을 새로고침해 주세요.',
}

export function uploadErrorMessage(error: unknown): string {
  const code = getErrorCode(error)

  return (
    (code && CODE_MESSAGE[code]) ||
    getErrorMessage(error, { 401: '로그인이 필요해요.' })
  )
}