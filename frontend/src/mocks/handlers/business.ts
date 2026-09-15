import { http } from 'msw'

import type { BizVerifyData } from '@/features/auth/api/businessVerify'
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
 * 국세청 `verify` 테이블. `backend/.../db/seed/local/R__verify_dummy.sql` 의 시드 3건과
 * 같은 값이다 — 목과 실서버에서 같은 입력이 통해야 화면을 옮겨 다니며 확인할 수 있다.
 *
 * 마지막 한 건은 시드에 없다. 휴·폐업 분기를 볼 방법이 달리 없어 목에만 둔다.
 */
const VERIFY_SEED: Record<string, BizVerifyData & { name: string }> = {
  '1234567890': {
    name: '박성현',
    type: '개인사업자',
    businessType: '한식음식점',
    businessName: '맛있는 한상',
    address: '서울특별시 강남구 테헤란로 123',
    openDate: '2022-03-15',
    isClose: false,
  },
  '2345678901': {
    name: '황문규',
    type: '개인사업자',
    businessType: '분식전문점',
    businessName: '서울분식',
    address: '서울특별시 마포구 양화로 45',
    openDate: '2021-08-20',
    isClose: false,
  },
  '3456789012': {
    name: '권병수',
    type: '개인사업자',
    businessType: '커피-음료',
    businessName: '카페 하루',
    address: '서울특별시 성동구 성수이로 78',
    openDate: '2023-01-10',
    isClose: false,
  },
  '9999999999': {
    name: '폐업자',
    type: '개인사업자',
    businessType: '한식음식점',
    businessName: '옛날국밥',
    address: '대구광역시 북구 산격동 12',
    openDate: '2019-05-02',
    isClose: true,
  },
}

/** 업체 (business) 목 핸들러. 메시지·에러코드는 실제 백엔드 값을 그대로 쓴다 */
export const businessHandlers = [
  /*
   * POST /api/v1/business/verify
   *
   * 실패 두 갈래를 백엔드와 같은 순서로 낸다 — 번호를 먼저 찾고(404 BUSINESS_001),
   * 찾은 뒤에 대표자명·개업일을 맞춰본다(400 BUSINESS_002).
   *
   * 휴·폐업은 실패가 아니다. 백엔드도 `isClose` 를 200 으로 내려보내고 막는 건 화면이다.
   */
  http.post('/api/v1/business/verify', async ({ request }) => {
    const { brn, name, openDate } = (await request.json()) as {
      brn?: string
      name?: string
      openDate?: string
    }
    const path = '/api/v1/business/verify'

    if (!brn || !name || !openDate) {
      return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)
    }

    // 하이픈을 떼지 않는다. 백엔드도 `findByBrn(request.getBrn())` 로 그대로 조회한다 —
    // 목만 너그러우면 하이픈을 붙여 보내는 호출부가 목에서만 통과한다
    const found = VERIFY_SEED[brn]

    if (!found) {
      return fail(
        404,
        'BUSINESS_001',
        '사업자 번호가 일치하는 사업자 정보를 찾을 수 없습니다.',
        path,
      )
    }

    if (found.name !== name || found.openDate !== openDate) {
      return fail(
        400,
        'BUSINESS_002',
        '입력한 사업자 정보와 실제 등록된 사업자 정보가 일치하지 않습니다.',
        path,
      )
    }

    const { name: _ownerName, ...response } = found

    return ok(response, '사업자 번호 기반 정보조회에 성공했습니다.', { path })
  }),

  /*
   * GET /api/v1/business/me
   *
   * ⚠️ 응답 필드가 아직 실제와 다르다. 실제는
   *    `{ businessName, bsn, name, businessType, address, openDate }` 이고
   *    `address` 가 전체 주소라 지역은 프론트에서 잘라 써야 한다 (S15P21D101-361).
   */
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
