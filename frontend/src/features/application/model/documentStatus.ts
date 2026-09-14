import type {
  ApplicationDocument,
  VerifyStatus,
  WriteStatus,
} from '@/features/application/model/types'
import type { SubmitDocumentStatus, WriteDocumentStatus } from '@/shared/constants/documentStatus'

/**
 * 서버 상태값 → 공용 컴포넌트가 아는 UI 상태.
 *
 * shared/constants/documentStatus.ts 가 정해 둔 대로다 — 컴포넌트는 UI 상태만 알고,
 * 서버 값이 바뀌면 이 파일만 고친다. 두 어휘가 대체로 겹치지만 완전히 같지는 않다.
 *
 *   NOT_SUBMITTED / NOT_STARTED → EMPTY
 *     UI 는 '아직 아무것도 안 한 상태' 를 종류에 상관없이 하나로 본다.
 *     제출 서류의 EMPTY 는 업로드 영역이 되고, 작성 서류의 EMPTY 는 배지를 숨긴다.
 *
 *   PENDING → VALIDATION_READY
 *     같은 뜻인데 이름만 다르다. 서버 값을 그대로 쓰지 않는 이유가 이거다 —
 *     한쪽 이름에 맞추려고 다른 쪽을 고치면 그때마다 반대편이 깨진다.
 */

const VERIFY_TO_UI: Record<VerifyStatus, SubmitDocumentStatus> = {
  NOT_SUBMITTED: 'EMPTY',
  PENDING: 'VALIDATION_READY',
  VALIDATING: 'VALIDATING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
}

const WRITE_TO_UI: Record<WriteStatus, WriteDocumentStatus> = {
  NOT_STARTED: 'EMPTY',
  WRITING: 'WRITING',
  WRITTEN: 'WRITTEN',
}

export function toSubmitUiStatus(status: VerifyStatus): SubmitDocumentStatus {
  return VERIFY_TO_UI[status]
}

export function toWriteUiStatus(status: WriteStatus): WriteDocumentStatus {
  return WRITE_TO_UI[status]
}

/**
 * 서류 카드 이름 아래에 넣을 문구.
 *
 * 상태마다 성격이 다르다 — 미제출은 어디서 발급받는지 안내하고, 검증 중·통과·실패는
 * 서버가 준 메시지를 그대로 보여준다. 서버가 아무 말도 안 하면 줄을 생략한다.
 */
export function describeDocument(doc: ApplicationDocument): string | null {
  if (doc.documentType === 'WRITE') {
    return doc.status === 'NOT_STARTED' ? doc.issuer : null
  }

  if (doc.status === 'NOT_SUBMITTED') {
    return doc.issuer ? `${doc.issuer}에서 즉시 발급받을 수 있어요` : null
  }

  return doc.validationMessage
}
