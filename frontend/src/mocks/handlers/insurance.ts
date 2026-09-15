import { http } from 'msw'

import { hasMockSession } from '@/mocks/handlers/auth'
import { fail, ok } from '@/mocks/lib/envelope'
import type { InsuranceStatus } from '@/shared/types'
import { INSURANCE_STATUS } from '@/shared/types'

/**
 * 의무보험 (insurance) 목 핸들러.
 *
 * 백엔드에 컨트롤러는 있지만 **`insurance_checklist` 를 채우는 코드가 없다.**
 * 체크리스트는 마이데이터 연동 시점에 생기기로 되어 있는데 그 작업이 아직이라,
 * 실서버에 붙어도 `{ insurances: [] }` 만 온다.
 *
 * ⚠️ 그래서 이 목은 **기본값으로는 절대 안 탄다.** 컨트롤러가 살아 있으니 실서버 우선
 *    규칙(`lib/serverFirst.ts`)이 빈 배열을 정상 응답으로 보고 그대로 쓴다. 화면을 보려면
 *    `.env.mock` 에 아래를 넣어 목을 강제해야 한다.
 *
 *      VITE_MOCK_FORCE=insurance
 *
 *    체크리스트를 채우는 작업이 백엔드에 생기면 이 줄을 지우면 된다.
 *
 * 이름·설명·조건은 `V11__insert_insurance_data.sql`·`V12__insert_mandatory_insurance_data.sql`
 * 의 실제 시드에서 가져왔다. 조건 전문은 항목당 30줄이 넘어 여기서는 줄였다 —
 * 구조([가입 대상]/[신고 방법]/[문의])만 같으면 모달 레이아웃을 확인하는 데 충분하다.
 */

/** 백엔드 `InsuranceCategory`. SOCIAL 은 전 업체 공통, MANDATORY 는 업종별이다 */
type InsuranceCategory = 'SOCIAL' | 'MANDATORY'

/** `GET /insurance` 의 배열 원소. 백엔드 `InsuranceItemResponse` 와 1:1 */
interface InsuranceItem {
  insuranceChecklistId: number
  insuranceId: number
  name: string
  info: string
  category: InsuranceCategory
  status: InsuranceStatus
}

/** `GET /insurance/{id}`. 목록 항목에 `condition` 이 더 붙고 `insuranceId` 가 빠진다 */
interface InsuranceDetail extends Omit<InsuranceItem, 'insuranceId'> {
  condition: string
}

/**
 * 사용자가 고른 상태. `PATCH` 결과를 새로고침 후에도 유지해 목록·상세가 같은 값을 보게 한다.
 *
 * 실제로는 DB에 남는 값이라 세션이 끝나면 사라지는 게 오히려 다르지만, 탭을 닫으면
 * 초기 상태로 돌아가야 흐름을 몇 번이고 다시 볼 수 있다 — `handlers/auth.ts` 와 같은 방침이다.
 */
const STATUS_KEY = 'msw:insurance-status'

function overrides(): Record<string, InsuranceStatus> {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(STATUS_KEY) ?? '{}')
    return typeof saved === 'object' && saved !== null
      ? (saved as Record<string, InsuranceStatus>)
      : {}
  } catch {
    return {}
  }
}

function saveOverride(checklistId: number, status: InsuranceStatus) {
  try {
    sessionStorage.setItem(STATUS_KEY, JSON.stringify({ ...overrides(), [checklistId]: status }))
  } catch {
    // 사생활 보호 모드·용량 초과. 저장만 못 할 뿐 요청은 성공으로 두는 게 낫다
    console.warn('[MSW] 의무보험 상태를 저장하지 못했습니다. 새로고침하면 되돌아갑니다.')
  }
}

/** 시드 기준 상태. 사용자가 고른 게 있으면 그걸 덮어쓴다 */
function statusOf(item: { insuranceChecklistId: number; status: InsuranceStatus }) {
  return overrides()[item.insuranceChecklistId] ?? item.status
}

/**
 * 체크리스트 시드.
 *
 * `insuranceId` 는 시드 삽입 순서를 따른다 — SOCIAL 1~4(국민연금·건강보험·고용보험·산재보험),
 * MANDATORY 5~11. 한식음식점 업체 하나를 가정해 `code_insurance` 매핑에 걸리는 항목만 담았다.
 *
 * 초기 status 는 마이데이터 연동 때 서버가 정한다(팀 결정). 프론트는 계산하지 않지만,
 * 목 데이터가 이 규칙과 어긋나면 화면을 잘못 읽게 되므로 맞춰둔다.
 *
 * | 항목                  | 가입 확인됨 | 미가입               |
 * | --------------------- | ---------- | -------------------- |
 * | 국민연금 · 건강보험     | COMPLETED  | REQUIRED             |
 * | 고용보험 · 산재보험     | COMPLETED  | NEEDS_VERIFICATION   |
 * | 업종별 의무보험         | COMPLETED  | NEEDS_VERIFICATION   |
 *
 * 국민연금·건강보험만 바로 REQUIRED 인 건 직원 유무와 무관하게 의무라 판단할 게 없어서다.
 * 고용·산재는 직원이 없으면 의무가 아니라(대표자 본인은 임의가입) 1인 사업자에게 REQUIRED 를
 * 띄우면 안 되고, 업종별 의무보험은 면적·설비 조건을 서버가 알 수 없어 사용자에게 묻는다.
 *
 * ⚠️ **`category` 로는 이 갈래를 알 수 없다.** 넷 다 SOCIAL 인데 둘씩 다르게 시작하고,
 *    이를 담는 컬럼이 없어 서버가 서비스 레이어에서 분기한다. 화면도 `category` 로
 *    의무 여부를 판단하면 안 된다 — 표시용 그룹핑에만 쓸 것.
 *
 * ⚠️ 그래서 **REQUIRED 는 두 가지 출처**가 섞인다 — 위 규칙으로 바로 정해진 것(건강보험)과
 *    사용자가 NEEDS_VERIFICATION 에서 고른 것(재난배상). 둘 다 더는 못 바꾸는 건 같다.
 *
 * 야영장사고·어린이놀이시설 배상책임보험은 대응하는 업종 코드가 없어 매핑이 0건이다.
 * 어떤 체크리스트에도 안 뜨므로 목에도 넣지 않았다.
 *
 * 네 가지 상태를 모두 한 번씩 넣었다. 하나라도 빠지면 그 상태의 배지·마크를 볼 수 없다.
 */
const CHECKLIST: (InsuranceDetail & { insuranceId: number })[] = [
  {
    insuranceChecklistId: 1,
    insuranceId: 1,
    name: '국민연금',
    info: '나이가 들거나 장애, 사망 시 경제적 어려움에 대비하는 사회보험',
    category: 'SOCIAL',
    status: 'COMPLETED',
    condition: `[사업자 기준 가입 대상]
- 직원이 있는 경우: 의무가입
- 직원이 없는 경우: 재산, 소득에 따라 지역가입자로 가입

[신고 방법]
- 전자신고(추천): 4대 사회보험 정보연계센터에서 4대보험 한 번에 신고
- 기타: 지사 방문, 팩스, 우편

[문의]
- 국민연금공단 콜센터 1355`,
  },
  {
    insuranceChecklistId: 2,
    insuranceId: 2,
    name: '건강보험',
    info: '다치거나 아파도 걱정 없이 치료받을 수 있도록 대비하는 사회보험',
    category: 'SOCIAL',
    // 미가입이면 확인을 물을 것 없이 바로 가입 필요다. 사용자가 상태를 바꿀 수 없다
    status: 'REQUIRED',
    condition: `[사업자 기준 가입 대상]
- 직원이 있는 경우: 의무가입
- 직원이 없는 경우: 지역가입자로 의무가입

[신고 방법]
- 전자신고(추천): 4대 사회보험 정보연계센터에서 4대보험 한 번에 신고
- 기타: 지사 방문, 팩스, 우편

[문의]
- 국민건강보험공단 콜센터 1577-1000`,
  },
  {
    insuranceChecklistId: 3,
    insuranceId: 3,
    name: '고용보험',
    info: '갑자기 일하지 못하게 되거나 소득이 감소했을 때를 대비하는 사회보험',
    category: 'SOCIAL',
    status: 'NEEDS_VERIFICATION',
    condition: `[사업자 기준 가입 대상]
- 직원이 있는 경우: 근로자는 의무가입 / 대표자 본인은 희망 시 선택 가입
- 직원이 없는 경우: 희망 시 선택 가입

[신고 방법]
- 전자신고(추천): 4대 사회보험 정보연계센터에서 4대보험 한 번에 신고
- 기타: 지사 방문, 팩스, 우편

[문의]
- 근로복지공단 콜센터 1588-0075`,
  },
  {
    insuranceChecklistId: 4,
    insuranceId: 4,
    name: '산재보험',
    info: '일하는 과정에서 사고를 당했을 때를 대비하는 사회보험',
    category: 'SOCIAL',
    status: 'COMPLETED',
    condition: `[사업자 기준 가입 대상]
- 직원이 있는 경우: 근로자는 의무가입 / 대표자 본인은 희망 시 선택 가입
- 직원이 없는 경우: 희망 시 선택 가입

[신고 방법]
- 전자신고(추천): 4대 사회보험 정보연계센터에서 4대보험 한 번에 신고
- 기타: 지사 방문, 팩스, 우편

[문의]
- 근로복지공단 콜센터 1588-0075`,
  },
  {
    insuranceChecklistId: 5,
    insuranceId: 5,
    name: '개인정보보호 배상책임보험',
    info: '개인정보 유출 등의 사고로 고객에게 손해배상 책임이 생겼을 때를 대비하는 의무보험',
    category: 'MANDATORY',
    status: 'EXEMPT',
    condition: `[가입 대상]
- 아래 두 요건을 모두 갖춘 개인정보처리자 (업종, 온라인/오프라인 무관)
  1) 전년도 매출액 10억원 이상
  2) 전년도 말 기준 직전 3개월간 저장·관리되는 개인정보 1만명분 이상

[문의]
- 개인정보보호위원회 국번 없이 182`,
  },
  {
    insuranceChecklistId: 6,
    insuranceId: 6,
    name: '다중이용업소 화재배상책임보험',
    info: '다중이용업소에서 화재(폭발 포함)로 다른 사람이 피해를 입었을 때를 대비하는 의무보험',
    category: 'MANDATORY',
    status: 'NEEDS_VERIFICATION',
    condition: `[가입 대상]
- 지하층 또는 2층 이상에서 영업하는 일반·휴게음식점 (영업장 면적 기준 있음)
- 유흥주점, 단란주점, 노래연습장, PC방, 목욕장, 실내골프연습장, 고시원 등

[가입 방법]
- 손해보험사에서 가입 후 소방서에 증명서 제출

[문의]
- 관할 소방서 또는 소방청 119`,
  },
  {
    insuranceChecklistId: 7,
    insuranceId: 7,
    name: '재난배상책임보험',
    info: '사업장에서 화재, 붕괴, 폭발 사고로 다른 사람이 피해를 입었을 때를 대비하는 의무보험',
    category: 'MANDATORY',
    status: 'REQUIRED',
    condition: `[가입 대상]
- 1층 일반·휴게음식점 (바닥면적 100㎡ 이상)
- 숙박업소, 장례식장, 물류창고 등

[가입 방법]
- 손해보험사에서 가입 후 관할 지자체에 신고

[문의]
- 관할 시·군·구청 안전총괄과`,
  },
  {
    insuranceChecklistId: 8,
    insuranceId: 8,
    name: '가스사고배상책임보험',
    info: '가스 누출, 폭발 등 가스 사고로 다른 사람이 피해를 입었을 때를 대비하는 의무보험',
    category: 'MANDATORY',
    status: 'NEEDS_VERIFICATION',
    condition: `[가입 대상]
- LPG(가스통 연결): 저장능력 250kg 이상 사용자
- LPG: 지하 또는 제1종 보호시설 안에 있는 영업장 면적 100㎡ 이상 식품접객업소
- 도시가스: 월 사용예정량 기준 있음

[문의]
- 한국가스안전공사 1544-4500`,
  },
]

/** 목록·상세 모두 사용자가 고른 상태를 반영해서 내려준다 */
function withStatus<T extends { insuranceChecklistId: number; status: InsuranceStatus }>(
  item: T,
): T {
  return { ...item, status: statusOf(item) }
}

/**
 * 인증 확인.
 *
 * 목 세션 플래그만 보면 안 된다. 목은 엔드포인트 단위로 빠지므로 로그인은 실서버가 받고
 * 이 요청만 목이 받는 조합이 생기는데, 그때 `msw:logged-in` 은 비어 있다.
 */
function authorized(request: Request) {
  return request.headers.get('Authorization') !== null || hasMockSession()
}

/**
 * 경로 변수는 문자열로 온다. 숫자가 아니면 없는 것으로 친다.
 *
 * 실제로는 스프링이 Long 변환에 실패해 500 COMMON_002 가 나지만(그 예외를 받는 핸들러가
 * `GlobalExceptionHandler` 에 없다), 화면이 만들 수 있는 요청이 아니라 흉내 내지 않는다.
 */
function toChecklistId(raw: string | readonly string[] | undefined): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * 업체 미등록 상태를 흉내 낸다. 콘솔에서 켠다:
 *   sessionStorage.setItem('msw:insurance', 'no-business')
 *
 * 목록만이 아니라 상세·상태변경에도 걸어야 한다. 백엔드는 셋 다 업체를 거쳐 조회하므로
 * (`findByIdAndUserId`) 업체가 없으면 상세·변경은 404 INSURANCE_001 이 된다.
 */
function hasBusiness() {
  return sessionStorage.getItem('msw:insurance') !== 'no-business'
}

export const insuranceHandlers = [
  /*
   * GET /api/v1/insurance
   *
   * 페이징·필터가 없다. 업종에 걸린 항목만 오므로 목록이 길지 않다.
   * 정렬은 서버가 한다 — SOCIAL 먼저, 그다음 insurance.id 순. 시드 순서가 곧 그 순서다.
   *
   * 업체를 등록하지 않은 계정은 404 BUSINESS_O04 다 — `hasBusiness` 주석 참고.
   */
  http.get('/api/v1/insurance', ({ request }) => {
    const path = '/api/v1/insurance'

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    if (!hasBusiness()) {
      return fail(404, 'BUSINESS_O04', '등록된 사업자 정보가 없습니다.', path)
    }

    const insurances = CHECKLIST.map(({ condition: _condition, ...item }) => withStatus(item))

    return ok({ insurances }, '의무보험 목록 조회에 성공하였습니다.', { path })
  }),

  /*
   * GET /api/v1/insurance/{insuranceChecklistId}
   *
   * ⚠️ 경로 변수는 `insurance.id` 가 아니라 **`insurance_checklist.id`** 다.
   *
   * 응답에 `status` 가 들어 있다. 상세 화면 하단의 '가입 필요 / 가입 제외' 버튼을
   * 보여줄지 이 값으로 판단한다.
   */
  http.get('/api/v1/insurance/:insuranceChecklistId', ({ request, params }) => {
    const path = `/api/v1/insurance/${String(params.insuranceChecklistId)}`

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    const id = toChecklistId(params.insuranceChecklistId)
    const found =
      id === null || !hasBusiness()
        ? undefined
        : CHECKLIST.find((i) => i.insuranceChecklistId === id)

    if (!found) {
      return fail(404, 'INSURANCE_001', '존재하지 않는 의무보험 항목입니다.', path)
    }

    const { insuranceId: _insuranceId, ...detail } = found

    return ok(withStatus(detail), '의무보험 상세 조회에 성공하였습니다.', { path })
  }),

  /*
   * PATCH /api/v1/insurance/{insuranceChecklistId}/status
   *
   * 되돌릴 수 없는 한 번짜리 선택이다. NEEDS_VERIFICATION 에서만, REQUIRED 나 EXEMPT 로만 간다.
   * 가입 완료는 마이데이터가 정하므로 사용자가 만질 수 없고, 한 번 고른 항목도 못 바꾼다.
   *
   * ⚠️ 검사 순서가 백엔드와 같아야 한다 — 값 검증(INSURANCE_003)이 조회(404)보다 **먼저**다.
   *    없는 id 에 COMPLETED 를 보내면 404 가 아니라 400 INSURANCE_003 이 온다.
   */
  http.patch('/api/v1/insurance/:insuranceChecklistId/status', async ({ request, params }) => {
    const path = `/api/v1/insurance/${String(params.insuranceChecklistId)}/status`

    if (!authorized(request)) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    const { status } = (await request.json()) as { status?: string }

    /*
     * 두 실패를 갈라야 한다.
     *   - enum 에 없는 문자열   → Jackson 역직렬화 실패 → COMMON_001
     *   - enum 이지만 못 고르는 값 → @NotNull 통과 후 서비스 검사 → INSURANCE_003
     * 뭉뚱그리면 오타를 보냈을 때 '가입 필요/제외로만' 이라는 엉뚱한 안내가 나간다.
     */
    // `in` 은 프로토타입까지 본다. 'toString' 같은 값이 enum 취급돼 아래 분기로 새어 나간다
    if (!status || !Object.hasOwn(INSURANCE_STATUS, status)) {
      return fail(400, 'COMMON_001', '입력값 중에 기준을 만족하지 않은 입력값이 있습니다.', path)
    }

    if (status !== INSURANCE_STATUS.REQUIRED && status !== INSURANCE_STATUS.EXEMPT) {
      return fail(400, 'INSURANCE_003', '가입 필요 또는 가입 제외로만 변경할 수 있습니다.', path)
    }

    const id = toChecklistId(params.insuranceChecklistId)
    const found =
      id === null || !hasBusiness()
        ? undefined
        : CHECKLIST.find((i) => i.insuranceChecklistId === id)

    if (!found) {
      return fail(404, 'INSURANCE_001', '존재하지 않는 의무보험 항목입니다.', path)
    }

    if (statusOf(found) !== INSURANCE_STATUS.NEEDS_VERIFICATION) {
      return fail(400, 'INSURANCE_002', '확인이 필요한 항목만 상태를 변경할 수 있습니다.', path)
    }

    saveOverride(found.insuranceChecklistId, status)

    // 백엔드는 204 가 아니라 200 + `data: null` 로 응답한다
    return ok(null, '의무보험 상태 변경에 성공하였습니다.', { path })
  }),
]
