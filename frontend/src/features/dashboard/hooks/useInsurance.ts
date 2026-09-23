import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  changeInsuranceStatus,
  getInsuranceDetail,
  getInsurances,
} from '@/features/dashboard/api/insurance'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { InsuranceStatus } from '@/shared/types'
import { isPreOwner } from '@/shared/types'

/** 업종에 걸린 항목이라 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않게 길게 잡는다 */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * 의무보험 체크리스트 목록.
 *
 * 사업자이고 로그인된 상태에서만 호출한다. 예비 창업자는 `business_info` 가 없어
 * 서버가 404 BUSINESS_004 를 주므로 없는 걸 물어보지 않는다 — 예비 창업자 화면은
 * 목으로 '이런 보험이 필요하다' 는 참고 목록만 보여준다.
 */
export function useInsurances() {
  const status = useAuthStore((s) => s.status)
  const role = useAuthStore((s) => s.user?.role)

  return useQuery({
    queryKey: queryKeys.insurance.list,
    queryFn: getInsurances,
    enabled: status === 'authenticated' && !isPreOwner(role ?? null),
    staleTime: STALE_TIME_MS,
  })
}

/**
 * 안내 창을 열 때 상세를 받아온다.
 *
 * 목록에도 `info` 는 있지만 `condition`(가입 조건 전문)은 상세에만 있다. 목록에 같이
 * 실으면 항목당 수십 줄이 딸려와 대시보드 첫 응답이 무거워진다.
 *
 * `insuranceChecklistId` 가 null 이면 닫힌 상태라 호출하지 않는다.
 */
export function useInsuranceDetail(insuranceChecklistId: number | null) {
  return useQuery({
    queryKey: queryKeys.insurance.detail(insuranceChecklistId ?? 0),
    queryFn: () => getInsuranceDetail(insuranceChecklistId as number),
    enabled: insuranceChecklistId !== null,
    staleTime: STALE_TIME_MS,
  })
}

interface ChangeStatusVariables {
  insuranceChecklistId: number
  status: Extract<InsuranceStatus, 'REQUIRED' | 'EXEMPT'>
}

/**
 * 확인 필요 항목의 판정 결과 저장.
 *
 * 목록의 배지·개수와 상세의 버튼이 같이 바뀌므로 `insurance.all` 로 한 번에 무효화한다.
 * 낙관적 업데이트는 하지 않는다 — 되돌릴 수 없는 선택이라, 실패했는데 바뀐 것처럼
 * 보이면 사용자가 이미 처리했다고 믿게 된다.
 */
export function useChangeInsuranceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ insuranceChecklistId, status }: ChangeStatusVariables) =>
      changeInsuranceStatus(insuranceChecklistId, status),
    /*
     * 실패해도 다시 받아온다. INSURANCE_002(확인 필요 상태가 아님)는 손에 든 목록이
     * 낡았다는 뜻이라, 여기서 갱신하지 않으면 사용자가 같은 400 을 계속 만난다.
     */
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.insurance.all })
    },
  })
}
