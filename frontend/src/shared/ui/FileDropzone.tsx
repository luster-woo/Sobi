import { type DragEvent, type ReactNode, useRef, useState } from 'react'

import { cn } from '@/shared/utils/cn'
import {
  DEFAULT_UPLOAD_ACCEPT,
  DEFAULT_UPLOAD_MAX_SIZE_MB,
  validateUploadFile,
} from '@/shared/utils/uploadFile'

interface FileDropzoneProps {
  /** 검사를 통과한 파일. 서류 하나에 파일 하나라 여러 개를 받지 않는다 */
  onSelect: (file: File) => void
  accept?: string[]
  maxSizeMb?: number
  disabled?: boolean
  /** 미제출은 점선, 검증 실패(다시 업로드)는 실선. 기본 dashed */
  variant?: 'dashed' | 'solid'
  /** 검사에서 걸렸을 때 사용자에게 보여줄 문구가 넘어온다 */
  onError?: (message: string) => void
  children: ReactNode
  className?: string
}

/**
 * 드래그&드롭 + 클릭으로 파일 하나를 받는 영역.
 *
 * 검증 상태를 모릅니다. 파일을 받아 넘기는 것까지만 하고, 검증 중·통과·실패 표시는
 * DocumentUploadItem 이 담당합니다.
 *
 * 파일 검사는 shared/utils/uploadFile 에 있습니다. 드롭 영역이 아닌 자리(작성 서류의
 * '작성본 올리기' 버튼)도 같은 검사를 써야 해서 밖으로 뺐습니다.
 *
 * button 으로 만든 이유: div + onClick 이면 키보드로 파일을 고를 수 없습니다.
 */
export default function FileDropzone({
  onSelect,
  accept = DEFAULT_UPLOAD_ACCEPT,
  maxSizeMb = DEFAULT_UPLOAD_MAX_SIZE_MB,
  disabled = false,
  variant = 'dashed',
  onError,
  children,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return

    const error = validateUploadFile(file, { accept, maxSizeMb })
    if (error) {
      onError?.(error)
      return
    }

    onSelect(file)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          // preventDefault 를 하지 않으면 브라우저가 파일을 새 탭으로 열어버린다
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'w-full rounded-md border px-5 py-4 text-left transition-colors',
          'focus-visible:outline-primary focus-visible:outline focus-visible:-outline-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isDragging
            ? 'border-primary bg-primary-soft'
            : variant === 'dashed'
              ? 'border-border-strong bg-surface-muted border-dashed'
              : 'border-border-strong bg-surface',
          className,
        )}
      >
        {/* 자식 위로 커서가 지나갈 때 dragleave 가 튀지 않게 이벤트를 막는다 */}
        <span className="pointer-events-none block">{children}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        hidden
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          // 같은 파일을 다시 고를 수 있게 비운다. 안 비우면 두 번째 선택에 onChange 가 안 난다
          event.target.value = ''
        }}
      />
    </>
  )
}
