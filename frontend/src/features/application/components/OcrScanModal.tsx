import { useEffect, useState } from 'react'

import {
  OcrCaption,
  OcrCheckList,
  OcrThumbnail,
} from '@/features/application/components/OcrScanPreview'
import type { LocalPreview } from '@/features/application/hooks/useLocalPreviews'
import { toSubmitUiStatus } from '@/features/application/model/documentStatus'
import { failedCheckOf, ocrChecksFor } from '@/features/application/model/ocrChecks'
import type { ApplicationDocument } from '@/features/application/model/types'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

const LARGE_SIZE = { width: 300, height: 400 }

/** 결과(도장·실패)를 보여주고 닫힐 때까지. 도장이 찍히는 것까지는 봐야 한다 */
const RESULT_HOLD_MS = 1800

const TITLE = {
  VALIDATING: '서류를 확인하고 있어요',
  PASSED: '서류 확인이 끝났어요',
  FAILED: '서류를 다시 확인해 주세요',
} as const

interface OcrScanModalProps {
  documents: ApplicationDocument[]
  previews: Map<number, LocalPreview>
}

/**
 * 검증이 시작된 서류를 크게 띄우는 팝업.
 *
 * 이 화면에서 올린 제출 서류만 띄운다 — 업로드에 대한 반응이라, 들어오자마자 예전에
 * 올린 서류로 팝업이 뜨면 영문을 모른다. 검증이 끝나면 결과를 잠깐 보여주고 닫힌다.
 *
 * 닫은 팝업은 다시 띄우지 않는다. 기준이 서류 id 가 아니라 미리보기 객체라서, 같은
 * 서류를 다시 올리면 새 미리보기가 생기고 팝업도 다시 뜬다.
 */
export default function OcrScanModal({ documents, previews }: OcrScanModalProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState<Set<LocalPreview>>(() => new Set())

  const active = documents.find((doc) => doc.applicationDocumentId === activeId)
  const activePreview = activeId === null ? undefined : previews.get(activeId)
  const status = active ? toSubmitUiStatus(active.validationStatus) : null
  const settled = status === 'PASSED' || status === 'FAILED'

  const candidate = documents.find((doc) => {
    const preview = previews.get(doc.applicationDocumentId)
    /*
     * PENDING 부터 띄운다. 실서버는 AI 가 한 장씩 처리해서 앞 서류를 기다리는 동안
     * PENDING 에 오래 머물고, 검증이 폴링 간격(2초)보다 빨리 끝나면 VALIDATING 을
     * 한 번도 못 볼 수 있다.
     */
    return (
      doc.documentType === 'SUBMIT' &&
      (doc.validationStatus === 'PENDING' || doc.validationStatus === 'VALIDATING') &&
      preview !== undefined &&
      !dismissed.has(preview)
    )
  })

  // 렌더 중에 맞춘다. 이펙트로 미루면 한 프레임 동안 팝업 없이 그려진다
  if (activeId === null && candidate) setActiveId(candidate.applicationDocumentId)
  if (activeId !== null && !active) setActiveId(null)

  const close = () => {
    if (activePreview) setDismissed((prev) => new Set(prev).add(activePreview))
    setActiveId(null)
  }

  useEffect(() => {
    if (!settled || !activePreview) return

    const timer = window.setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(activePreview))
      setActiveId(null)
    }, RESULT_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [settled, activePreview])

  const open = active !== undefined && status !== null && status !== 'EMPTY'
  const shownStatus = open && status !== 'VALIDATION_READY' ? status : 'VALIDATING'

  return (
    <Modal
      open={open}
      onClose={close}
      title={TITLE[shownStatus]}
      size="lg"
      /* X 와 푸터 버튼이 똑같이 close 를 부른다. 같은 일을 하는 버튼을 둘 두지 않는다 */
      hideClose
      footer={
        <Button variant="outline" onClick={close}>
          {settled ? '닫기' : '뒤에서 계속 확인하기'}
        </Button>
      }
    >
      {active && (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <OcrThumbnail
            status={shownStatus}
            preview={activePreview}
            originalFilename={active.originalFilename}
            large
            {...LARGE_SIZE}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <p className="text-body1 text-text font-semibold">{active.documentName}</p>
              {active.originalFilename && (
                <p className="text-caption text-text-muted mt-0.5 truncate">
                  {active.originalFilename}
                </p>
              )}
            </div>

            <OcrCaption status={shownStatus} className="text-body2" />

            {shownStatus === 'FAILED' && active.validationMessage && (
              <p className="text-body2 text-danger bg-danger-soft rounded-sm px-3 py-2">
                {active.validationMessage}
              </p>
            )}

            <OcrCheckList
              status={shownStatus}
              checks={ocrChecksFor(active.documentName ?? '')}
              failedCheck={failedCheckOf(active.validationMessage)}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
