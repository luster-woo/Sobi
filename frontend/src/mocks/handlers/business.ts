import { http } from 'msw'

import type { BusinessSummary } from '@/features/business/model/types'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 업체 미등록 상태(사이드바 카드가 '업체 등록하기' 로 바뀜)를 보려면 콘솔에서:
 *   sessionStorage.setItem('msw:business', 'none')
 *
 * 예비 창업자는 이 핸들러를 타지 않는다. `useBusinessSummary` 가 role 로 걸러서
 * 요청 자체를 보내지 않는다 — 확인하려면 `handlers/auth.ts` 의 mockUser.role 을
 * PRE_OWNER 로 바꿔야 한다.
 */
const BUSINESS_KEY = 'msw:business'

const mockSummary: BusinessSummary = {
  name: '한상차림',
  region: '대구',
  industryName: '한식 음식점업',
}

/**
 * 업체 (business) 목 핸들러.
 *
 * ⚠️ 응답 필드가 아직 실제와 다르다. 실제는
 *    `{ businessName, bsn, name, businessType, address, openDate }` 이고
 *    `address` 가 전체 주소라 지역은 프론트에서 잘라 써야 한다 (S15P21D101-361).
 */
export const businessHandlers = [
  // GET /api/v1/business/me
  http.get('/api/v1/business/me', () => {
    // 업체 미등록은 404 + BUSINESS_O04 다. 코드의 O 는 숫자 0 이 아니라 영문 대문자 (백엔드 오타)
    if (sessionStorage.getItem(BUSINESS_KEY) === 'none') {
      return fail(404, 'BUSINESS_O04', '등록된 사업자 정보가 없습니다.', '/api/v1/business/me')
    }

    return ok(mockSummary, '사업자 번호 기반 정보등록에 성공했습니다.', {
      path: '/api/v1/business/me',
    })
  }),
]
