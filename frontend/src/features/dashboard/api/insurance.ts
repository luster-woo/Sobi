import type { DashboardInsurance } from '@/features/dashboard/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { InsuranceCategory, InsuranceStatus } from '@/shared/types'

/** `GET /insurance` 응답. 배열이 아니라 한 겹 감싸져 온다 */
interface InsuranceListResponse {
  insurances: (DashboardInsurance & {
    /** 보험 종류 id. 화면은 안 쓰지만 응답에 있다 */
    insuranceId: number
    info: string
    category: InsuranceCategory
  })[]
}

/**
 * `GET /insurance/{id}` 응답. 백엔드 `InsuranceDetailResponse` 와 1:1.
 *
 * 목록 항목에 `condition`(가입 조건 전문)이 더 붙고 `insuranceId` 가 빠진다.
 * `status` 가 함께 오므로 목록을 거치지 않고 열어도 선택 버튼을 그릴 수 있다.
 */
export interface InsuranceDetail {
  insuranceChecklistId: number
  name: string
  info: string
  condition: string
  category: InsuranceCategory
  status: InsuranceStatus
}

/**
 * 의무보험 체크리스트 목록.
 *
 * 정렬은 서버가 한다 — 4대 사회보험(SOCIAL) 먼저, 그다음 보험 id 순.
 * 업체를 등록하지 않은 계정은 404 BUSINESS_004 다. 예비 창업자가 여기 해당하므로
 * 호출하는 쪽이 role 로 먼저 걸러야 한다.
 */
export async function getInsurances() {
  const { data } = await api.get<InsuranceListResponse>(endpoints.insurance.list)
  return data.insurances
}

/** ⚠️ 경로 변수는 `insurance.id` 가 아니라 `insurance_checklist.id` 다 */
export async function getInsuranceDetail(insuranceChecklistId: number) {
  const { data } = await api.get<InsuranceDetail>(endpoints.insurance.detail(insuranceChecklistId))
  return data
}

/**
 * 확인 필요 항목의 판정 결과를 저장한다.
 *
 * 되돌릴 수 없는 한 번짜리 선택이다. `NEEDS_VERIFICATION` 에서만, `REQUIRED` 나
 * `EXEMPT` 로만 갈 수 있다 — 가입 완료는 마이데이터가 정하고, 한 번 고른 항목도 못 바꾼다.
 *
 * 실패는 세 갈래다.
 *   - 400 INSURANCE_003 — 고를 수 없는 값을 보냄
 *   - 404 INSURANCE_001 — 없거나 남의 체크리스트
 *   - 400 INSURANCE_002 — 확인 필요 상태가 아님 (이미 고른 항목을 또 고름)
 */
export async function changeInsuranceStatus(
  insuranceChecklistId: number,
  status: Extract<InsuranceStatus, 'REQUIRED' | 'EXEMPT'>,
) {
  await api.patch(endpoints.insurance.changeStatus(insuranceChecklistId), { status })
}
