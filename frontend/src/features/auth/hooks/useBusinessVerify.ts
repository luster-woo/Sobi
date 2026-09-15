import { useMutation } from '@tanstack/react-query'

import type { BizVerifyRequest } from '@/features/auth/api/businessVerify'
import { verifyBusiness } from '@/features/auth/api/businessVerify'

/**
 * 사업자 진위확인.
 *
 * 조회라서 useQuery 가 맞아 보이지만 버튼을 눌렀을 때만 나가야 해서 mutation 이다.
 * 캐시에 담지 않는 것도 의도다 — 같은 번호라도 다시 조회하면 국세청에 다시 물어야 한다.
 */
export function useBusinessVerify() {
  return useMutation({
    mutationFn: (body: BizVerifyRequest) => verifyBusiness(body),
  })
}
