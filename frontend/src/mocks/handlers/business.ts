import { http } from 'msw'

import type { BizVerifyData } from '@/features/auth/api/businessVerify'
import type { BusinessMeResponse } from '@/features/business/model/types'
import { hasMockSession, promoteToOwner } from '@/mocks/handlers/auth'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 업체 미등록 상태(사이드바 카드가 '업체 등록하기' 로 바뀜)를 보려면 콘솔에서:
 *   sessionStorage.setItem('msw:business', 'none')
 *
 * 예비 창업자는 `/business/me` 를 타지 않는다. `useBusinessSummary` 가 role 로 걸러
 * 요청 자체를 보내지 않는다 — `pre@sogong.com` 으로 로그인하면 확인할 수 있다.
 */
const BUSINESS_KEY = 'msw:business'

/**
 * 등록한 사업자등록번호들. 같은 번호를 두 번 등록할 때 실제 서버처럼 500 을 내려고 기억한다.
 *
 * 마지막 하나만 들고 있으면 A → B → A 순서에서 세 번째가 통과해버린다. 실제
 * `business_info.brn` 유니크 제약은 순서와 무관하므로 전부 기억한다.
 */
const REGISTERED_BRN_KEY = 'msw:business-brns'

function registeredBrns(): string[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(REGISTERED_BRN_KEY) ?? '[]')
    return Array.isArray(saved) ? (saved as string[]) : []
  } catch {
    return []
  }
}

/** 가장 최근에 등록한 번호. `/business/me` 가 이걸로 응답을 고른다 */
function latestBrn(): string | undefined {
  return registeredBrns().at(-1)
}

/** 이 세션에서 등록한 업체가 없을 때 내려주는 기본값. 시드의 첫 번째 업체와 같다 */
const mockBusinessMe: BusinessMeResponse = {
  businessName: '맛있는 한상',
  bsn: '1234567890',
  name: '맛있는 한상',
  businessType: '한식음식점',
  address: '서울특별시 강남구 테헤란로 123',
  openDate: '2022-03-15',
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

/**
 * 등록한 업체를 `GET /business/me` 응답 모양으로 바꾼다.
 *
 * 백엔드 `BusinessInfoResponse.from` 을 그대로 흉내 낸다 — `name` 에 대표자명이 아니라
 * 상호명이 들어가는 것까지. 목만 대표자명을 주면 `name` 을 잘못 쓰는 호출부가 목에서만 맞아 보인다.
 */
function toBusinessMe(brn: string, verify: (typeof VERIFY_SEED)[string]): BusinessMeResponse {
  return {
    businessName: verify.businessName,
    bsn: brn,
    name: verify.businessName,
    businessType: verify.businessType,
    address: verify.address,
    openDate: verify.openDate,
  }
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
   * POST /api/v1/business — 업체 등록
   *
   * 서버는 body 의 brn 으로 `verify` 를 다시 찾아 `business_info` 를 만들고 role 을
   * ENTREPRENEUR 로 바꾼다. 목도 같은 순서로 흉내 내고, `promoteToOwner()` 로 목 세션의
   * role 을 올려 뒤이은 `/auth/refresh` 가 바뀐 role 이 담긴 토큰을 주게 한다.
   *
   * ⚠️ 같은 번호를 두 번 등록하면 실제로는 유니크 제약에 걸려 **500** 이다. 목도
   *    그대로 흉내 낸다 — 뒤로가기로 돌아와 다시 등록하는 경로가 실제로 있다.
   */
  http.post('/api/v1/business', async ({ request }) => {
    const { brn } = (await request.json()) as { brn?: string }
    const path = '/api/v1/business'

    /*
     * 실제 엔드포인트는 Authorization 이 필수다. 목에서도 비로그인 분기를 볼 수 있어야 한다.
     *
     * 목 세션 플래그만 보면 안 된다. 목은 엔드포인트 단위로 빠지므로(`lib/serverFirst.ts`)
     * 로그인은 실서버가 받고 이 요청만 목이 받는 조합이 실제로 생기는데, 그때
     * `msw:logged-in` 은 비어 있어 멀쩡히 로그인한 사용자가 401 을 맞는다.
     * 헤더를 먼저 보고, 없을 때만 목 세션으로 판단한다.
     */
    const authorized = request.headers.get('Authorization') !== null || hasMockSession()
    if (!authorized) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    if (!brn) return fail(400, 'COMMON_001', '입력값이 올바르지 않습니다.', path)

    if (!VERIFY_SEED[brn]) {
      return fail(
        404,
        'BUSINESS_001',
        '사업자 번호가 일치하는 사업자 정보를 찾을 수 없습니다.',
        path,
      )
    }

    const registered = registeredBrns()

    if (registered.includes(brn)) {
      return fail(500, 'COMMON_002', '서버 내부 오류가 발생했습니다.', path)
    }

    sessionStorage.setItem(REGISTERED_BRN_KEY, JSON.stringify([...registered, brn]))
    sessionStorage.removeItem(BUSINESS_KEY)
    promoteToOwner()

    return ok(null, '사업자 번호 기반 정보등록에 성공했습니다.', { path })
  }),

  /*
   * GET /api/v1/business/me
   *
   * 응답은 백엔드 `BusinessInfoResponse` 그대로다. 지역 필드가 없어서 사이드바의
   * '서울 강남구' 는 프론트가 `address` 에서 잘라 만든다 (`toRegionLabel`).
   */
  http.get('/api/v1/business/me', () => {
    // 업체 미등록은 404 + BUSINESS_004 다 (한동안 영문 O 가 섞인 오타였고 백엔드가 고쳤다)
    if (sessionStorage.getItem(BUSINESS_KEY) === 'none') {
      return fail(404, 'BUSINESS_004', '등록된 사업자 정보가 없습니다.', '/api/v1/business/me')
    }

    // 이 세션에서 등록한 업체가 있으면 그걸 보여준다. 등록 직후 사이드바에 방금 넣은
    // 상호가 떠야 등록이 먹혔는지 알 수 있다
    const brn = latestBrn()
    const registered = brn ? VERIFY_SEED[brn] : undefined

    // 메시지는 백엔드 오타 그대로다 — 조회인데 '정보등록에 성공했습니다' 로 온다
    return ok(
      brn && registered ? toBusinessMe(brn, registered) : mockBusinessMe,
      '사업자 번호 기반 정보등록에 성공했습니다.',
      { path: '/api/v1/business/me' },
    )
  }),
]
