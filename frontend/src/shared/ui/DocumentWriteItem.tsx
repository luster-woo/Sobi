import type { ReactNode } from 'react'

import type { WriteDocumentStatus } from '@/shared/constants/documentStatus'
import { WRITE_DOCUMENT_STATUS_LABEL } from '@/shared/constants/documentStatus'
import Button from '@/shared/ui/Button'
import Spinner from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

// 작성 서류 영역 (원본받기 + 초안 작성본 받기)

interface DocumentWriteItemProps {
  /** 서류 이름 ex) 자금 사용 계획서 */
  name: string
  status: WriteDocumentStatus
  description?: ReactNode
  /** 빈 양식 받기. 양식 url 이 없는 서류는 넘기지 않으면 버튼이 사라집니다 */
  onDownloadOriginal?: () => void
  /** 초안 작성 시작. 미작성 상태에서만 나옵니다 */
  onStartDraft?: () => void
  /** 완성된 초안 받기. 작성 완료 상태에서만 나옵니다 */
  onDownloadDraft?: () => void
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
 * 업로드도 검증도 없습니다. 빈 양식을 받거나, 사용자 정보를 채운 초안을 서버가
 * 만들어주는 흐름입니다. 미작성 → 작성중 → 작성완료 로 흘러갑니다.
 *
 * 미작성일 때 배지를 숨기는 이유: 아직 시작도 안 한 상태에 '미작성' 을 붙이면 뭔가
 * 잘못한 것처럼 보입니다. 이 상태에서는 버튼이 안내 역할을 합니다.
 *
 * 작성중에는 두 번째 버튼을 그리지 않습니다. 서버가 만드는 동안 누를 게 없고,
 * 배지가 '작성 중' 을 말해줍니다. 폴링이 끝나면 작성 완료로 바뀝니다.
 */
export default function DocumentWriteItem({
  name,
  status,
  description,
  onDownloadOriginal,
  onStartDraft,
  onDownloadDraft,
  className,
}: DocumentWriteItemProps) {
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
          {status === 'WRITING' && <Spinner size={12} decorative />}
          {WRITE_DOCUMENT_STATUS_LABEL[status]}
        </span>
      )}

      <div className="flex shrink-0 gap-2">
        {onDownloadOriginal && (
          <Button variant="outline" size="sm" onClick={onDownloadOriginal}>
            원본 받기
          </Button>
        )}

        {status === 'EMPTY' && onStartDraft && (
          <Button variant="outline" size="sm" onClick={onStartDraft}>
            초안 작성본 받기
          </Button>
        )}

        {status === 'WRITTEN' && onDownloadDraft && (
          <Button variant="outline" size="sm" onClick={onDownloadDraft}>
            초안 받기
          </Button>
        )}
      </div>
    </div>
  )
}
