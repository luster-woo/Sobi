import type { NotificationItem } from '@/features/notification/model/types'
import { ROUTES, routeTo } from '@/shared/constants/routes'
import { NOTIFICATION_TYPE, type NotificationType } from '@/shared/types'

/** 대상 이름을 모를 때. 서버가 targetName 을 안 내려주면 이걸 쓴다 */
const FALLBACK_MESSAGE: Record<NotificationType, string> = {
  [NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM]: '신청할 수 있는 지원사업이 등록됐어요',
  [NOTIFICATION_TYPE.NEW_LOAN]: '신청할 수 있는 대출 상품이 등록됐어요',
  [NOTIFICATION_TYPE.SUPPORT_PROGRAM_REVIEWED]: '지원사업 심사 결과가 나왔어요',
  [NOTIFICATION_TYPE.LOAN_REVIEWED]: '대출 심사 결과가 나왔어요',
}

const NAMED_MESSAGE: Record<NotificationType, (name: string) => string> = {
  [NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM]: (name) => `${name} 지원사업을 신청할 수 있어요`,
  [NOTIFICATION_TYPE.NEW_LOAN]: (name) => `${name} 상품을 신청할 수 있어요`,
  [NOTIFICATION_TYPE.SUPPORT_PROGRAM_REVIEWED]: (name) => `${name} 심사 결과가 나왔어요`,
  [NOTIFICATION_TYPE.LOAN_REVIEWED]: (name) => `${name} 심사 결과가 나왔어요`,
}

export function notificationMessage({ type, targetName }: NotificationItem): string {
  return targetName ? NAMED_MESSAGE[type](targetName) : FALLBACK_MESSAGE[type]
}

/**
 * 눌렀을 때 갈 곳.
 *
 * 심사 결과 두 종은 targetId 가 application 을 가리키는데 신청 건 하나를 여는 경로가
 * 아직 없다. 목록으로 보내고, targetId 활용은 API 연결 때 정한다.
 */
export function notificationLink({ type, targetId }: NotificationItem): string {
  switch (type) {
    case NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM:
      return routeTo.supportProgramDetail(targetId)
    case NOTIFICATION_TYPE.NEW_LOAN:
      return routeTo.loanDetail(targetId)
    default:
      return ROUTES.APPLICATIONS
  }
}
