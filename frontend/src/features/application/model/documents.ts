import type { ApplicationDocument } from '@/features/application/model/types'

/**
 * 서류 상태를 읽는 함수들.
 *
 * 화면 여러 곳이 같은 판정을 필요로 한다 — 하단 제출 버튼의 '서류 N건 남음',
 * 진행률, 폴링을 계속할지 여부. 각자 계산하면 조건이 갈라지므로 여기 모은다.
 */

/** 더 손댈 게 없는 서류. '완료' 의 정의는 여기 하나뿐이다 */
export function isDone(doc: ApplicationDocument): boolean {
  return doc.documentType === 'WRITE' ? doc.status === 'WRITTEN' : doc.status === 'PASSED'
}

/**
 * 서버가 검증을 돌리는 중인 서류.
 *
 * 하나라도 있으면 화면이 가만히 있어도 상태가 바뀐다는 뜻이라, 폴링을 계속해야 한다.
 */
export function isValidating(doc: ApplicationDocument): boolean {
  if (doc.documentType === 'VERIFY') {
    return doc.status === 'PENDING' || doc.status === 'VALIDATING'
  }

  // 작성 서류는 서버가 초안을 만드는 동안만 기다린다.
  // 초안이 나오면(draftUrl) 다음은 사용자 차례라 더 물어볼 이유가 없다
  return doc.status === 'WRITING' && doc.draftUrl === null
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
    verify: documents.filter((doc) => doc.documentType === 'VERIFY'),
    write: documents.filter((doc) => doc.documentType === 'WRITE'),
  }
}
