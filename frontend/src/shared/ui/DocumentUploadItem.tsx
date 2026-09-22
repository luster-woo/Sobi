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
  /**
   * 사용자가 올린 파일 이름. 아직 안 올렸으면 넘기지 않습니다.
   *
   * 서류 이름(name)과 따로 받는 이유는 둘이 다른 값이기 때문입니다 — '사업자등록증명원'
   * 을 올릴 때 파일은 '증명원_최종.pdf' 일 수 있고, 검증이 실패했을 때 사용자가 확인해야
   * 하는 건 후자입니다.
   */
  fileName?: string | null
  /**
   * 카드 아래쪽에 붙는 영역. 올린 서류의 검증 모습(OCR 미리보기)이 들어간다.
   * 카드가 button 일 수 있어 span 으로만 그려야 한다.
   */
  detail?: ReactNode
  onSelectFile: (file: File) => void
  /** 확장자·용량·파일명 검사에서 걸렸을 때 */
  onFileError?: (message: string) => void
  accept?: string[]
  maxSizeMb?: number
  /**
   * 읽기 전용. 신청이 접수된 뒤처럼 더 손덩 수 없는 때 켭니다.
   * 미제출·검증 실패여도 올리기를 열지 않습니다.
   */
  readOnly?: boolean
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
  fileName,
  detail,
  onSelectFile,
  onFileError,
  accept,
  maxSizeMb,
  readOnly = false,
  className,
}: DocumentUploadItemProps) {
  const isEmpty = status === 'EMPTY'
  const isUploadable = !readOnly && (isEmpty || status === 'FAILED')

  const row = (
    <span className="flex w-full items-center gap-4">
      <span className="min-w-0 flex-1">
        <span className={cn('text-body1 text-text block', !isEmpty && 'font-semibold')}>
          {isEmpty ? `＋ ${name} 끌어오거나 클릭해서 업로드` : name}
        </span>
        {/*
          파일명을 서류 이름 바로 아래, 설명보다 위에 둡니다. 검증 실패 문구를 읽기 전에
          '내가 무엇을 올렸나' 부터 확인하게 되는 순서라서입니다.
        */}
        {fileName && (
          /*
            줄이지 않고 전부 보여줍니다. 배지·버튼과 다른 줄이라 밀어낼 것이 없고,
            올린 파일이 맞는지 확인하는 게 이 줄의 유일한 목적이라서입니다.

            break-all 은 공백 없는 긴 파일명 때문입니다. 한글·영문 파일명에는 띄어쓰기가
            없는 경우가 많아, 그대로 두면 한 덩어리가 칸을 넘어 삐져나갑니다.
          */
          <span className="text-body2 text-text-secondary mt-1 block break-all">{fileName}</span>
        )}
        {description && (
          <span className="text-body2 text-text-secondary mt-1 block">{description}</span>
        )}
      </span>

      <span className={cn(pillBase, pillClass[status])}>
        {status === 'VALIDATING' && <Spinner size={12} decorative />}
        {SUBMIT_DOCUMENT_STATUS_LABEL[status]}
      </span>

      {status === 'FAILED' && !readOnly && (
        /*
         * 실제 button 이 아니라 span 입니다. 바깥이 이미 button 이라 중첩을 피해야 하고,
         * 클릭은 어차피 바깥으로 전달돼 파일 선택이 열립니다.
         */
        <span className="border-border-strong text-body2 text-text bg-surface inline-flex h-9 shrink-0 items-center rounded-sm border px-4 font-semibold">
          다시 업로드
        </span>
      )}
    </span>
  )

  const body = detail ? (
    <span className="block w-full">
      {row}
      {detail}
    </span>
  ) : (
    row
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
    <div className={cn('border-border bg-surface rounded-md border px-5 py-4', className)}>
      {body}
    </div>
  )
}
