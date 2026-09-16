import type { ApplicationDocument, ValidationStatus } from '@/features/application/model/types'
import type { SubmitDocumentStatus, WriteDocumentStatus } from '@/shared/constants/documentStatus'

/**
 * 서버 상태값 → 공용 컴포넌트가 아는 UI 상태.
 *
 * shared/constants/documentStatus.ts 가 정해 둔 대로다 — 컴포넌트는 UI 상태만 알고,
 * 서버 값이 바뀌면 이 파일만 고친다. 두 어휘가 대체로 겹치지만 완전히 같지는 않다.
 *
 *   NOT_SUBMITTED / NOT_STARTED → EMPTY
 *     UI 는 '아직 아무것도 안 한 상태' 를 종류에 상관없이 하나로 본다.
 *
 *   PENDING → VALIDATION_READY
 *     같은 뜻인데 이름만 다르다. 서버 값을 그대로 쓰지 않는 이유가 이거다 —
 *     한쪽 이름에 맞추려고 다른 쪽을 고치면 그때마다 반대편이 깨진다.
 *
 * 서버가 한 서류에 두 상태를 단다. 검증(validationStatus)은 모든 서류가 갖고,
 * 초안(draftStatus)은 작성 서류만 갖는다. 그래서 변환도 둘로 나뉜다.
 */

const VALIDATION_TO_UI: Record<ValidationStatus, SubmitDocumentStatus> = {
  NOT_SUBMITTED: 'EMPTY',
  PENDING: 'VALIDATION_READY',
  VALIDATING: 'VALIDATING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
}

export function toSubmitUiStatus(status: ValidationStatus): SubmitDocumentStatus {
  return VALIDATION_TO_UI[status]
}

/**
 * 작성 서류 배지.
 *
 * 두 축을 하나로 눌러 담는다. 공용 컴포넌트가 아는 값이 EMPTY·WRITING·WRITTEN 셋뿐이라
 * '검증 중' 을 표현할 자리가 없다.
 *
 *   초안 만드는 중   WRITING   스피너가 돈다
 *   검증 통과        WRITTEN   '작성 완료'
 *   그 외            EMPTY     배지를 숨긴다
 *
 * 완료를 draftStatus 가 아니라 validationStatus 로 보는 이유: 초안이 만들어진 것과
 * 사용자가 그걸 손봐서 올린 것은 다른 사건이다. 서버도 검증 통과만 완료로 센다.
 */
export function toWriteUiStatus(doc: ApplicationDocument): WriteDocumentStatus {
  if (doc.draftStatus === 'WRITING') return 'WRITING'
  if (doc.validationStatus === 'PASSED') return 'WRITTEN'
  return 'EMPTY'
}

/**
 * 서류 카드 이름 아래에 넣을 문구.
 *
 * 서버가 준 검증 메시지를 그대로 보여준다. 아무 말도 안 하면 줄을 생략한다.
 *
 * ⚠️ 예전에는 미제출 서류에 '홈택스에서 즉시 발급받을 수 있어요' 를 띄웠다.
 *    확정 응답에 issuer(발급처)가 없어져서 그 안내가 사라졌다. 발급처는 상품마다
 *    정해진 값이라 서버가 주는 편이 맞는데, 빠진 것인지 확인이 필요하다.
 */
export function describeDocument(doc: ApplicationDocument): string | null {
  return doc.validationMessage
}
