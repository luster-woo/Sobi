import { DOCUMENT_TYPE, type DocumentType } from '@/features/application/model/types'

/**
 * 업로드 제한.
 *
 * 화면에 적는 문구와 실제로 막는 값을 같은 상수에서 만든다. 따로 두면 안내는 PDF 만
 * 된다는데 다른 게 올라가는 식으로 어긋난다.
 *
 * 종류마다 다르다. 제출 서류는 AI 가 OCR 로 읽어야 해서 이미지·PDF 만 받는다.
 * 작성 서류는 검증을 타지 않고 사람이 고쳐서 다시 올리는 파일이라, 편집할 수 있는
 * 형식까지 받는다 — LLM 초안을 한글·워드로 열어 고치면 .hwp·.docx 가 된다.
 *
 * ⚠️ 서버는 확장자뿐 아니라 파일 앞부분 시그니처까지 본다. 이름만 바꾼 파일은
 *    걸린다(ApplicationDocumentServiceImpl.readValidatedContent). 화면에서는
 *    거기까지 막지 않으므로, 형식이 맞는데 서버가 거절하는 경우가 있을 수 있다.
 */
const SUBMIT_ACCEPT = ['.pdf', '.png', '.jpg', '.jpeg']
const WRITE_ACCEPT = ['.hwp', '.hwpx', '.doc', '.docx', '.pdf']

export function uploadAccept(documentType: DocumentType): string[] {
  return documentType === DOCUMENT_TYPE.WRITE ? WRITE_ACCEPT : SUBMIT_ACCEPT
}

/** 서버의 서류 한도. spring 의 multipart 한도(20MB)보다 엄격하다 */
export const UPLOAD_MAX_SIZE_MB = 10

/** '업로드 제한' 패널에 적을 형식 문구. '.pdf' → 'PDF' */
function toLabel(accept: string[]): string {
  return accept.map((ext) => ext.slice(1).toUpperCase()).join(' · ')
}

export const SUBMIT_ACCEPT_LABEL = toLabel(SUBMIT_ACCEPT)
export const WRITE_ACCEPT_LABEL = toLabel(WRITE_ACCEPT)
