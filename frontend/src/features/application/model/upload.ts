/**
 * 업로드 제한.
 *
 * 화면에 적는 문구와 FileDropzone 이 실제로 막는 값을 같은 상수에서 만든다. 따로 두면
 * 안내는 PDF 만 된다는데 DOCX 가 올라가는 식으로 어긋난다.
 *
 * 형식은 업로드 API 명세를 따랐다. 시안에는 PDF·JPG·PNG 로 적혀 있는데 명세가 기준이다.
 * 용량은 명세에 '20MB?' 로 미정이라 시안의 10MB 를 쓴다. 확정되면 여기만 고치면 된다.
 */
export const UPLOAD_ACCEPT = ['.pdf', '.docx', '.hwpx']

export const UPLOAD_MAX_SIZE_MB = 10

/** '업로드 제한' 패널에 적을 형식 문구. '.pdf' → 'PDF' */
export const UPLOAD_ACCEPT_LABEL = UPLOAD_ACCEPT.map((ext) => ext.slice(1).toUpperCase()).join(
  ' · ',
)
