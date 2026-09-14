export const DEFAULT_UPLOAD_ACCEPT = ['.pdf', '.png', '.jpg', '.jpeg']
export const DEFAULT_UPLOAD_MAX_SIZE_MB = 10

/** ERD 의 application_document.original_filename 이 VARCHAR(255) 다 */
export const MAX_FILENAME_LENGTH = 255

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase()
}

interface UploadLimit {
  accept?: string[]
  maxSizeMb?: number
}

/**
 * 올리기 전 파일 검사. 통과하면 null, 걸리면 사용자에게 보여줄 문구를 돌려준다.
 *
 * 서버 왕복을 줄이려는 것도 있지만, 파일명 길이는 DB 컬럼 제한이라 넘기면 저장 단계에서
 * 깨진다.
 *
 * FileDropzone 밖에 둔 이유: 드롭 영역 말고 평범한 버튼으로 파일을 받는 자리(작성 서류의
 * '작성본 올리기')도 같은 검사를 해야 하는데, 그쪽은 드롭 영역이 아니라서 컴포넌트를
 * 쓸 수 없다. 검사 규칙이 두 벌이 되면 한쪽만 고쳐지는 일이 생긴다.
 */
export function validateUploadFile(
  file: File,
  { accept = DEFAULT_UPLOAD_ACCEPT, maxSizeMb = DEFAULT_UPLOAD_MAX_SIZE_MB }: UploadLimit = {},
): string | null {
  if (!accept.includes(getExtension(file.name))) {
    return `${accept.join(' · ')} 파일만 올릴 수 있어요`
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `${maxSizeMb}MB 이하 파일만 올릴 수 있어요`
  }
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return `파일 이름을 ${MAX_FILENAME_LENGTH}자 이하로 줄여주세요`
  }
  return null
}
