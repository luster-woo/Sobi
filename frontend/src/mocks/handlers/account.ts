import { http, HttpResponse } from 'msw'

import type { PayoutAccount } from '@/features/application/model/types'
import type { ApiResponse } from '@/shared/types'

/**
 * 계좌 목 (S15P21D101-189)
 *
 * 서버는 AccountServiceImpl 에서 type = COMMON 만 걸러서 준다. 대출 계좌는 여기
 * 나오지 않으므로 목도 입출금만 담는다.
 */
const accounts: PayoutAccount[] = [
  { accountId: 15, bankName: '대구은행', accountNo: '50812345678' },
  { accountId: 16, bankName: '싸피은행', accountNo: '00219876543' },
]

export const accountHandlers = [
  http.get('/api/v1/account/list', () =>
    HttpResponse.json({
      statusCode: 200,
      timestamp: '2026-09-14T10:00:00',
      path: '/api/v1/account/list',
      message: '계좌 목록 조회에 성공하였습니다.',
      data: { accountList: accounts },
      error: null,
    } satisfies ApiResponse<{ accountList: PayoutAccount[] }>),
  ),
]
