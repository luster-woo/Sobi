import type { CSSProperties } from 'react'

import type { LocalPreview } from '@/features/application/hooks/useLocalPreviews'
import { OCR_CHECK_LABEL, type OcrCheckKey } from '@/features/application/model/ocrChecks'
import type { SubmitDocumentStatus } from '@/shared/constants/documentStatus'
import { cn } from '@/shared/utils/cn'

export type OcrStatus = Exclude<SubmitDocumentStatus, 'EMPTY'>

/** 카드 안 썸네일 크기. 팝업은 부르는 쪽이 크게 넘긴다 */
const COMPACT_SIZE = { width: 66, height: 88 }

const CAPTION: Record<OcrStatus, string> = {
  VALIDATION_READY: '검증 순서를 기다리고 있어요',
  VALIDATING: 'AI가 서류를 읽고 내 정보와 대조하고 있어요',
  PASSED: '검토 항목을 모두 통과했어요',
  FAILED: '확인되지 않은 항목이 있어요',
}

const CAPTION_COLOR: Record<OcrStatus, string> = {
  VALIDATION_READY: 'text-text-secondary',
  VALIDATING: 'text-progress',
  PASSED: 'text-success',
  FAILED: 'text-danger',
}

/** 상태 한 줄. 카드와 팝업이 같은 문구·색을 쓴다 */
export function OcrCaption({ status, className }: { status: OcrStatus; className?: string }) {
  return (
    <span className={cn('block font-semibold', CAPTION_COLOR[status], className)}>
      {CAPTION[status]}
    </span>
  )
}

function extensionOf(preview: LocalPreview | undefined, filename: string | null): string {
  if (preview) return preview.extension
  return filename?.split('.').pop()?.toUpperCase() ?? ''
}

interface OcrThumbnailProps {
  status: OcrStatus
  preview: LocalPreview | undefined
  originalFilename: string | null
  width: number
  height: number
  /** 팝업처럼 크게 그릴 때. 도장·확장자 글자를 키운다 */
  large?: boolean
}

export function OcrThumbnail({
  status,
  preview,
  originalFilename,
  width,
  height,
  large = false,
}: OcrThumbnailProps) {
  const scanning = status === 'VALIDATION_READY' || status === 'VALIDATING'

  return (
    <span
      className="border-border bg-surface-muted relative block max-w-full shrink-0 overflow-hidden rounded-sm border"
      style={{ width, height }}
    >
      {preview?.imageUrl ? (
        <img src={preview.imageUrl} alt="" className="size-full object-cover object-top" />
      ) : (
        <span
          className={cn('flex size-full flex-col', large ? 'gap-4 px-8 pt-12' : 'gap-1 px-2 pt-3')}
        >
          {[80, 100, 64, 92, 72].map((w, i) => (
            <span
              key={i}
              className={cn('bg-border-strong/60 block rounded-full', large ? 'h-2' : 'h-[3px]')}
              style={{ width: `${w}%` }}
            />
          ))}
          <span
            className={cn(
              'text-text-muted mt-auto text-center font-semibold',
              large ? 'text-h3 mb-8' : 'text-caption mb-1.5',
            )}
          >
            {extensionOf(preview, originalFilename)}
          </span>
        </span>
      )}

      {scanning && <span className="bg-progress/5 absolute inset-0" />}

      {status === 'VALIDATING' && (
        <span
          aria-hidden="true"
          className={cn(
            'animate-ocr-scan absolute inset-x-0 top-0',
            large ? 'h-16' : 'h-6',
            'from-progress/0 via-progress/25 to-progress/0 bg-linear-to-b',
            'after:bg-progress after:absolute after:inset-x-0 after:top-1/2 after:h-px',
          )}
          style={{ '--scan-distance': `${height}px` } as CSSProperties}
        />
      )}

      {status === 'PASSED' && (
        <span className="bg-surface/40 absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'border-primary text-primary bg-surface/85 animate-stamp-in -rotate-[14deg] font-extrabold',
              large
                ? 'text-h2 rounded-md border-4 px-5 py-2 tracking-widest'
                : 'rounded-sm border-2 px-1.5 py-0.5 text-[11px] tracking-wider',
            )}
          >
            확인
          </span>
        </span>
      )}

      {status === 'FAILED' && <span className="bg-danger/10 absolute inset-0" />}
    </span>
  )
}

function CheckChip({
  label,
  state,
  pulsing,
}: {
  label: string
  state: 'pending' | 'passed' | 'failed'
  pulsing: boolean
}) {
  return (
    <span
      className={cn(
        'text-caption inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
        state === 'passed' && 'border-success-soft bg-success-soft text-success',
        state === 'failed' && 'border-danger bg-danger-soft text-danger font-semibold',
        state === 'pending' && 'border-border text-text-secondary bg-surface',
        pulsing && 'animate-pulse',
      )}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {state === 'passed' ? '✓' : state === 'failed' ? '✕' : '•'}
      </span>
      {label}
    </span>
  )
}

interface OcrCheckListProps {
  status: OcrStatus
  checks: OcrCheckKey[]
  /** 실패 문구에서 짚은 항목. 모르면 null */
  failedCheck: OcrCheckKey | null
}

/**
 * 확인 항목 칩.
 *
 * 항목별 결과는 서버가 주지 않는다. 통과면 전부 통과이고, 실패면 문구로 짚은 한 항목만
 * 빨갛게 칠한다. 나머지를 통과로 칠하지 않는 이유는 AI 가 첫 실패에서 멈췄는지 알 수
 * 없어서다.
 */
export function OcrCheckList({ status, checks, failedCheck }: OcrCheckListProps) {
  const stateOf = (key: OcrCheckKey) => {
    if (status === 'PASSED') return 'passed'
    if (status === 'FAILED' && key === failedCheck) return 'failed'
    return 'pending'
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {checks.map((key) => (
        <CheckChip
          key={key}
          label={OCR_CHECK_LABEL[key]}
          state={stateOf(key)}
          pulsing={status === 'VALIDATING'}
        />
      ))}
    </span>
  )
}

interface OcrScanPreviewProps extends OcrCheckListProps {
  /** 이번 화면에서 올린 파일. 없으면 확장자 아이콘으로 대신한다 */
  preview: LocalPreview | undefined
  originalFilename: string | null
}

/**
 * 제출 서류 카드 안의 OCR 영역. 작은 썸네일과 확인 항목을 보여준다.
 * 검증하는 동안 크게 보여주는 것은 OcrScanModal 이 맡는다.
 *
 * 바깥이 FileDropzone(button)일 수 있어서 span 만 쓴다.
 */
export default function OcrScanPreview({
  status,
  checks,
  failedCheck,
  preview,
  originalFilename,
}: OcrScanPreviewProps) {
  return (
    <span className="border-border-subtle mt-3 flex items-start gap-4 border-t pt-3">
      <OcrThumbnail
        status={status}
        preview={preview}
        originalFilename={originalFilename}
        {...COMPACT_SIZE}
      />

      <span className="min-w-0 flex-1">
        <OcrCaption status={status} className="text-caption mb-2" />
        <OcrCheckList status={status} checks={checks} failedCheck={failedCheck} />
      </span>
    </span>
  )
}
