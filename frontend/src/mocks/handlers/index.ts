import { accountHandlers } from './account'
import { applicationHandlers } from './application'
import { authHandlers } from './auth'
import { businessHandlers } from './business'
import { fundingHandlers } from './funding'
import { loanHandlers } from './loan'
import { marketHandlers } from './market'
import { notificationHandlers } from './notification'
import { repaymentHandlers } from './repayment'
import { supportHandlers } from './support'


/**
 * 도메인별 핸들러를 여기에 모읍니다.
 * 새 도메인이 생기면 `handlers/{도메인}.ts` 를 만들고 아래에 추가하세요.
 */
export const handlers = [
  ...accountHandlers,
  ...applicationHandlers,
  ...authHandlers,
  ...businessHandlers,
  ...fundingHandlers,
  ...loanHandlers,
  ...marketHandlers,
  ...notificationHandlers,
  ...repaymentHandlers,
  ...supportHandlers,
]
