import type { ApplicationDocument } from '@/features/application/model/types'

/**
 * 서류 상태를 읽는 함수들.
 *
 * 화면 여러 곳이 같은 판정을 필요로 한다 — 하단 제출 버튼의 '서류 N건 남음',
 * 진행률, 폴링을 계속할지 여부. 각자 계산하면 조건이 갈라지므로 여기 모은다.
 */

/**
 * 더 손댈 게 없는 서류.
 *
 * 종류를 가리지 않고 검증 통과만 본다. 서버가 그렇게 센다 —
 * validateDocumentsPassed 가 모든 서류의 validationStatus 를 PASSED 로 요구하고,
 * completedCount 도 같은 기준이다. 작성 서류도 초안을 손봐서 올린 뒤 검증을 받는다.
 *
 * 그래서 draftStatus 는 완료 판정에 안 쓴다. 초안이 나왔다는 것(WRITTEN)은
 * 사용자가 아직 올리지 않았다는 뜻이기도 하다.
 */
export function isDone(doc: ApplicationDocument): boolean {
  return doc.validationStatus === 'PASSED'
}

/**
 * 서버가 일하고 있는 서류.
 *
 * 하나라도 있으면 화면이 가만히 있어도 상태가 바뀐다는 뜻이라, 폴링을 계속해야 한다.
 * 검증과 초안 생성 둘 다 서버가 비동기로 돈다.
 */
export function isValidating(doc: ApplicationDocument): boolean {
  if (doc.validationStatus === 'PENDING' || doc.validationStatus === 'VALIDATING') {
    return true
  }

  // 초안이 나오면 다음은 사용자 차례라 더 물어볼 이유가 없다
  return doc.draftStatus === 'WRITING'
}

/** 사용자가 지금 뭔가 해야 하는 서류. 올리거나, 다시 올리거나, 작성하거나 */
export function needsAction(doc: ApplicationDocument): boolean {
  return !isDone(doc) && !isValidating(doc)
}

export function countDone(documents: ApplicationDocument[]): number {
  return documents.filter(isDone).length
}

/** 제출 버튼에 띄울 남은 건수. 검증 중인 것도 아직 안 끝난 거라 포함한다 */
export function countRemaining(documents: ApplicationDocument[]): number {
  return documents.filter((doc) => !isDone(doc)).length
}

/** 검증이 돌고 있으면 true. 폴링 여부를 이걸로 정한다 */
export function hasValidating(documents: ApplicationDocument[]): boolean {
  return documents.some(isValidating)
}

/** 제출 서류와 작성 서류는 화면에서 따로 묶여 보인다 */
export function splitByType(documents: ApplicationDocument[]) {
  return {
    submit: documents.filter((doc) => doc.documentType === 'SUBMIT'),
    write: documents.filter((doc) => doc.documentType === 'WRITE'),
  }
}
