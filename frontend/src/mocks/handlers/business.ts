import { http, HttpResponse } from 'msw'

import type { BusinessSummary } from '@/features/business/model/types'

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
 * 업체 (business) 목 핸들러
 *
 * 응답 형태는 백엔드 명세 확정 전 임시입니다.
 * 확정되면 이 파일과 `features/business/model/types.ts` 를 함께 수정해야 합니다.
 */
export const businessHandlers = [
  // GET /api/v1/businesses/me/summary
  http.get('/api/v1/businesses/me/summary', () => {
    if (sessionStorage.getItem(BUSINESS_KEY) === 'none') {
      return HttpResponse.json({ message: '등록된 업체가 없습니다' }, { status: 404 })
    }

    return HttpResponse.json(mockSummary)
  }),
]
