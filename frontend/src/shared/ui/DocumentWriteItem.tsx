import { type ReactNode, useRef } from 'react'

import type { WriteDocumentStatus } from '@/shared/constants/documentStatus'
import { WRITE_DOCUMENT_STATUS_LABEL } from '@/shared/constants/documentStatus'
import Button from '@/shared/ui/Button'
import { cn } from '@/shared/utils/cn'
import { DEFAULT_UPLOAD_ACCEPT, validateUploadFile } from '@/shared/utils/uploadFile'

// 작성 서류 영역 (빈 서식 받기 + 초안 + 작성본 올리기)

interface DocumentWriteItemProps {
  /** 서류 이름 ex) 자금 사용 계획서 */
  name: string
  status: WriteDocumentStatus
  description?: ReactNode
  /** 기관이 배포하는 빈 서식 받기. 서식이 없는 서류는 넘기지 않으면 버튼이 사라집니다 */
  onDownloadOriginal?: () => void
  /** AI 초안 받기. 서버가 만들어서 그 자리에서 내려줍니다 */
  onWriteDraft?: () => void
  /** 초안을 만드는 중. 최대 5분이라 버튼을 잠그고 부르는 쪽이 진행 화면을 띄웁니다 */
  isDraftPending?: boolean
  /** 사용자가 확인·수정한 작성본을 올립니다. 넘기지 않으면 업로드 버튼이 사라집니다 */
  onSelectFile?: (file: File) => void
  /** 확장자·용량·파일명 검사에서 걸렸을 때 */
  onFileError?: (message: string) => void
  accept?: string[]
  maxSizeMb?: number
  className?: string
}

const pillBase =
  'text-caption inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold'

const pillClass: Record<WriteDocumentStatus, string> = {
  EMPTY: 'border-border-strong border-dashed text-text-disabled',
  WRITING: 'border-border-strong text-text-secondary',
  WRITTEN: 'border-primary bg-primary text-text-inverse',
}

/**
 * 작성용 서류 한 건.
 *
 * 빈 양식을 받거나, 사용자 정보를 채운 초안을 서버가 만들어 줍니다. 사용자가 그걸
 * 확인·수정해서 올리면 작성 완료입니다. 제출 서류와 달리 OCR 검증은 하지 않습니다 —
 * 올리는 순간 통과입니다.
 *
 * 미작성 → 작성완료 로 흘러갑니다. 사용자가 작성본을 올리면 완료입니다.
 *
 * 미작성일 때 배지를 숨기는 이유: 아직 시작도 안 한 상태에 '미작성' 을 붙이면 뭔가
 * 잘못한 것처럼 보입니다. 이 상태에서는 버튼이 안내 역할을 합니다.
 *
 * '작성 중' 은 서버가 쓰지 않습니다. 초안 생성이 동기라 그 상태를 기록할 구간 자체가
 * 없습니다 — 부르면 만들어서 바로 돌려줍니다. 타입에는 남겨 두지만 실제로는 오지 않습니다.
 *
 * 초안 버튼이 하나입니다. 예전에는 '만들기' 와 '받기' 가 나뉘어 있었는데, 서버가 만든
 * 것을 보관하지 않아서 따로 받을 것이 없습니다. 누를 때마다 새로 만들어 줍니다.
 *
 * 만드는 동안 버튼을 잠급니다. 연타하면 같은 요청이 여러 번 나가는데, 한 번에 AI 가
 * 수 분씩 도는 작업이라 비용이 그대로 곱해집니다.
 *
 * 업로드는 어느 상태에서나 됩니다. 초안을 안 받고 직접 쓴 문서를 올릴 수도 있어야 하고,
 * 올린 뒤 잘못 올린 걸 깨달으면 다시 올려야 합니다.
 *
 * 업로드를 FileDropzone 으로 안 만든 이유: 그쪽은 카드 하나를 덮는 드롭 영역이라
 * 옆 버튼들과 크기·글꼴·hover 가 어긋납니다. 여기서는 공용 Button 을 그대로 쓰고
 * 숨긴 input 을 대신 열어 줍니다. 파일 검사는 둘 다 같은 validateUploadFile 을 씁니다.
 */
export default function DocumentWriteItem({
  name,
  status,
  description,
  onDownloadOriginal,
  onWriteDraft,
  isDraftPending = false,
  onSelectFile,
  onFileError,
  accept = DEFAULT_UPLOAD_ACCEPT,
  maxSizeMb,
  className,
}: DocumentWriteItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return

    const error = validateUploadFile(file, { accept, maxSizeMb })
    if (error) {
      onFileError?.(error)
      return
    }

    onSelectFile?.(file)
  }

  return (
    <div
      className={cn(
        'border-border bg-surface flex flex-wrap items-center gap-3 rounded-md border px-5 py-4',
        className,
      )}
    >
      <div className="min-w-[160px] flex-1">
        <p className="text-body1 text-text font-semibold">{name}</p>
        {description && <p className="text-body2 text-text-secondary mt-1">{description}</p>}
      </div>

      {status !== 'EMPTY' && (
        <span className={cn(pillBase, pillClass[status])}>
          {WRITE_DOCUMENT_STATUS_LABEL[status]}
        </span>
      )}

      <div className="flex shrink-0 flex-wrap gap-2">
        {onDownloadOriginal && (
          <Button variant="outline" size="sm" onClick={onDownloadOriginal}>
            빈 서식 받기
          </Button>
        )}

        {onWriteDraft && (
          <Button variant="outline" size="sm" disabled={isDraftPending} onClick={onWriteDraft}>
            {isDraftPending ? '초안 만드는 중' : 'AI 초안 받기'}
          </Button>
        )}

        {onSelectFile && (
          <>
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {status === 'WRITTEN' ? '다시 올리기' : '작성본 올리기'}
            </Button>

            <input
              ref={inputRef}
              type="file"
              accept={accept.join(',')}
              hidden
              onChange={(event) => {
                handleFile(event.target.files?.[0])
                // 같은 파일을 다시 고를 수 있게 비운다
                event.target.value = ''
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
