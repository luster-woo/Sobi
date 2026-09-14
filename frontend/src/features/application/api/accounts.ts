import type { PayoutAccount } from '@/features/application/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 출금 계좌 후보.
 *
 * 서버가 입출금(COMMON) 계좌만 걸러서 주므로 화면에서 대출 계좌를 거를 필요가 없다.
 *
 * 지금은 신청 화면만 쓴다. 마이페이지 계좌 화면(현재 목)이 이걸 쓰기 시작하면
 * 두 feature 가 되니 그때 shared 로 올린다.
 *
 * 봉투는 `client.ts` 인터셉터가 벗긴다. 알맹은 { accountList } 다.
 */
export async function getPayoutAccounts() {
  const { data } = await api.get<{ accountList: PayoutAccount[] }>(endpoints.account.list)
  return data.accountList
}
