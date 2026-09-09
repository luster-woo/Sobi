/**
 * 신청 서류의 상태.
 *
 * ERD 의 application_document.validation_status 하나가 제출용·작성용 두 종류의 상태를
 * 겸합니다(검증 4종 + 작성 2종). 화면에서는 서류 종류에 따라 나올 수 있는 값이 다르므로
 * 두 개로 나눠 정의합니다.
 *
 * ⚠️ EMPTY(미제출·미작성)는 서버 값이 아닙니다. application_document 레코드가 아직 없는
 *    상태이고, 화면에서는 그게 첫 모습입니다. 그래서 서버 enum 을 그대로 쓰지 않고
 *    UI 상태를 따로 둡니다.
 *
 * ⚠️ 응답에 실제로 오는 문자열은 아직 확인 전입니다. 값이 확정되면 화면에서 이 UI 상태로
 *    매핑합니다 — 컴포넌트는 UI 상태만 압니다.
 */

/** 제출용 — 발급받아 업로드하고 자동 검증을 받는다 */
export const SUBMIT_DOCUMENT_STATUS = {
  EMPTY: 'EMPTY', // 미제출
  VALIDATION_READY: 'VALIDATION_READY', // 검증 준비중
  VALIDATING: 'VALIDATING', // 검증 진행중
  PASSED: 'PASSED', // 검증 통과
  FAILED: 'FAILED', // 검증 실패
} as const

export type SubmitDocumentStatus =
  (typeof SUBMIT_DOCUMENT_STATUS)[keyof typeof SUBMIT_DOCUMENT_STATUS]

export const SUBMIT_DOCUMENT_STATUS_LABEL: Record<SubmitDocumentStatus, string> = {
  EMPTY: '미제출',
  VALIDATION_READY: '검증 대기',
  VALIDATING: '검증 중',
  PASSED: '검증 통과',
  FAILED: '검증 실패',
}

/** 작성용 — 양식을 받아 사용자 정보를 채워 초안을 만든다 */
export const WRITE_DOCUMENT_STATUS = {
  EMPTY: 'EMPTY', // 미작성
  WRITING: 'WRITING', // 작성중
  WRITTEN: 'WRITTEN', // 작성완료
} as const

export type WriteDocumentStatus = (typeof WRITE_DOCUMENT_STATUS)[keyof typeof WRITE_DOCUMENT_STATUS]

export const WRITE_DOCUMENT_STATUS_LABEL: Record<WriteDocumentStatus, string> = {
  EMPTY: '미작성',
  WRITING: '작성 중',
  WRITTEN: '작성 완료',
}
