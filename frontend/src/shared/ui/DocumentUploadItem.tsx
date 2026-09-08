import type { ReactNode } from 'react'

import type { SubmitDocumentStatus } from '@/shared/constants/documentStatus'
import { SUBMIT_DOCUMENT_STATUS_LABEL } from '@/shared/constants/documentStatus'
import FileDropzone from '@/shared/ui/FileDropzone'
import Spinner from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

// 제출 서류 영역

interface DocumentUploadItemProps {
  /** 서류 이름. ex) 부가세 과세표준증명원 */
  name: string
  status: SubmitDocumentStatus
  /**
   * 이름 아래 문구. 상태마다 성격이 달라서 화면이 넣습니다.
   *   미제출 → 발급 안내 ('홈택스·정부24에서 즉시 발급받을 수 있어요')
   *   검증 중 → 무엇을 확인하고 있는지
   *   통과   → 확인된 항목 요약
   *   실패   → validation_message (실패 사유)
   */
  description?: ReactNode
  onSelectFile: (file: File) => void
  /** 확장자·용량·파일명 검사에서 걸렸을 때 */
  onFileError?: (message: string) => void
  accept?: string[]
  maxSizeMb?: number
  className?: string
}

const pillBase =
  'text-caption inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold'

const pillClass: Record<SubmitDocumentStatus, string> = {
  EMPTY: 'border-border-strong border-dashed text-text-disabled',
  VALIDATION_READY: 'border-border-strong text-text-secondary',
  VALIDATING: 'border-border-strong text-text-secondary',
  PASSED: 'border-primary bg-primary text-text-inverse',
  FAILED: 'border-danger text-danger',
}

/**
 * 제출용 서류 한 건.
 *
 * 미제출·검증 실패는 파일을 받아야 하므로 FileDropzone(button)으로 감싸고,
 * 검증 대기·검증 중·통과는 누를 게 없으니 평범한 div 로 그립니다.
 *
 * 안쪽 마크업이 span 인 이유: FileDropzone 이 button 이라 그 안에 div·p 를 넣으면
 *    HTML 규칙 위반입니다. display 는 클래스로 줍니다.
 */
export default function DocumentUploadItem({
  name,
  status,
  description,
  onSelectFile,
  onFileError,
  accept,
  maxSizeMb,
  className,
}: DocumentUploadItemProps) {
  const isEmpty = status === 'EMPTY'
  const isUploadable = isEmpty || status === 'FAILED'

  const body = (
    <span className="flex w-full items-center gap-4">
      <span className="min-w-0 flex-1">
        <span className={cn('text-body1 text-text block', !isEmpty && 'font-semibold')}>
          {isEmpty ? `＋ ${name} 끌어오거나 클릭해서 업로드` : name}
        </span>
        {description && (
          <span className="text-body2 text-text-secondary mt-1 block">{description}</span>
        )}
      </span>

      <span className={cn(pillBase, pillClass[status])}>
        {status === 'VALIDATING' && <Spinner size={12} decorative />}
        {SUBMIT_DOCUMENT_STATUS_LABEL[status]}
      </span>

      {status === 'FAILED' && (
        /*
         * 실제 button 이 아니라 span 입니다. 바깥이 이미 button 이라 중첩을 피해야 하고,
         * 클릭은 어차피 바깥으로 전달돼 파일 선택이 열립니다.
         */
        <span className="border-border-strong text-body2 text-text bg-surface inline-flex h-9 shrink-0 items-center rounded-md border px-4 font-semibold">
          다시 업로드
        </span>
      )}
    </span>
  )

  if (isUploadable) {
    return (
      <FileDropzone
        variant={isEmpty ? 'dashed' : 'solid'}
        accept={accept}
        maxSizeMb={maxSizeMb}
        onSelect={onSelectFile}
        onError={onFileError}
        className={className}
      >
        {body}
      </FileDropzone>
    )
  }

  return (
    <div className={cn('border-border bg-surface rounded-lg border px-5 py-4', className)}>
      {body}
    </div>
  )
}
