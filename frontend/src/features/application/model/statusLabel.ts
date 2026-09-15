import type { ApplicationSource } from '@/features/application/model/types'
import { APPLICATION_STATUS_LABEL, type ApplicationStatus } from '@/shared/types/application'

/**
 * 신청 상태 문구. PAID 만 도메인마다 다르다.
 *
 *   대출      돈이 계좌로 들어온 것이라 '실행 완료'
 *   지원사업   지원금을 받은 것이라 '지급 완료'
 *
 * ProductStatus 의 APPROVED 가 '보유중' / '선정' 으로 갈리는 것과 같은 이유다.
 * 서버가 주는 값은 하나고 문구만 갈린다.
 */
export function applicationStatusLabel(
  status: ApplicationStatus,
  sourceType: ApplicationSource,
): string {
  if (status === 'PAID') {
    return sourceType === 'LOAN' ? '실행 완료' : '지급 완료'
  }

  return APPLICATION_STATUS_LABEL[status]
}

/**
 * 더 진행될 게 없는 상태. 목록 탭을 '진행 중' 과 '완료' 로 가르는 기준이다.
 *
 * 반려도 완료로 본다. 사용자가 더 할 게 없다는 점에서 같고, 진행 중 탭에 남아 있으면
 * 계속 기다려야 하는 것처럼 보인다.
 */
export function isSettled(status: ApplicationStatus): boolean {
  return status === 'PAID' || status === 'REJECTED'
}
