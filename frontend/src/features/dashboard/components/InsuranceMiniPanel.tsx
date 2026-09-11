import { useState } from 'react'

import InsuranceDetailModal from '@/features/dashboard/components/InsuranceDetailModal'
import MiniPanel from '@/features/dashboard/components/MiniPanel'
import { type DashboardInsurance, INSURANCE_STATUS_LABEL } from '@/features/dashboard/model/types'
import { INSURANCE_STATUS, type InsuranceStatus } from '@/shared/types'
import Badge from '@/shared/ui/Badge'
import { cn } from '@/shared/utils/cn'

interface InsuranceMiniPanelProps {
  insurances: DashboardInsurance[]
}

const markClass: Record<InsuranceStatus, string> = {
  COMPLETED: 'bg-primary text-text-inverse',
  NEEDS_VERIFICATION: 'bg-warning-soft text-warning',
  REQUIRED: 'bg-danger-soft text-danger',
  EXEMPT: 'bg-bg-canvas text-text-muted',
}

/** 가입 완료만 체크 표시고 나머지는 글자다. 체크를 색만 바꿔 쓰면 미가입도 끝난 것처럼 보인다 */
const markGlyph: Record<Exclude<InsuranceStatus, 'COMPLETED'>, string> = {
  NEEDS_VERIFICATION: '?',
  REQUIRED: '!',
  EXEMPT: '–',
}

function Mark({ status }: { status: InsuranceStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        markClass[status],
      )}
    >
      {status === INSURANCE_STATUS.COMPLETED ? (
        <svg
          viewBox="0 0 24 24"
          className="size-[9px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      ) : (
        markGlyph[status]
      )}
    </span>
  )
}

/** 제목 옆 배지. 급한 것 하나만 알린다 — 두 개를 붙이면 어느 쪽이 급한지 알 수 없다 */
function summaryBadge(insurances: DashboardInsurance[]) {
  const required = insurances.filter((i) => i.status === INSURANCE_STATUS.REQUIRED).length
  if (required > 0) return <Badge variant="danger">{required}건 미가입</Badge>

  const unclear = insurances.filter((i) => i.status === INSURANCE_STATUS.NEEDS_VERIFICATION).length
  if (unclear > 0) return <Badge variant="warning">{unclear}건 확인 필요</Badge>

  return <Badge variant="success">가입 완료</Badge>
}

/**
 * 의무보험 체크리스트.
 *
 * 의무보험은 업체가 아니라 업종에 붙는다(shared/types/insurance.ts). 그래서 목록은
 * 업체가 고른 것이 아니라 업종 때문에 걸린 항목이고, 미가입은 과태료 대상이라
 * 신청 가능한 자금보다 급한 정보다.
 *
 * 줄 전체가 버튼이다. 좁은 열 안에서 '가입 안내' 같은 작은 링크를 따로 두면 눌러야 할
 * 곳을 찾게 되고, 어차피 줄에서 할 일이 안내 창을 여는 것 하나뿐이다.
 */
export default function InsuranceMiniPanel({ insurances }: InsuranceMiniPanelProps) {
  /**
   * ⚠️ 상태 변경을 화면 안에서만 기억한다. `PATCH /insurance/{id}/status` 가 붙으면
   *    이 state 를 지우고 useMutation + invalidateQueries 로 바꾼다.
   */
  const [items, setItems] = useState(insurances)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (items.length === 0) return null

  // 객체가 아니라 id 를 들고 있는다. 상태를 바꾼 뒤에도 열린 모달이 최신 값을 본다
  const selected = items.find((item) => item.insuranceChecklistId === selectedId) ?? null

  const changeStatus = (insuranceChecklistId: number, status: InsuranceStatus) => {
    setItems((previous) =>
      previous.map((item) =>
        item.insuranceChecklistId === insuranceChecklistId ? { ...item, status } : item,
      ),
    )
  }

  return (
    <>
      <MiniPanel label="업종별 필수 가입 항목" title="의무보험" aside={summaryBadge(items)}>
        <ul className="-mx-1.5 flex flex-col">
          {items.map((insurance) => (
            <li key={insurance.insuranceChecklistId}>
              <button
                type="button"
                onClick={() => setSelectedId(insurance.insuranceChecklistId)}
                className="hover:bg-surface-muted focus-visible:outline-primary flex w-full items-center gap-2 rounded-sm px-1.5 py-1.5 text-left transition-colors focus-visible:outline focus-visible:-outline-offset-2"
              >
                <Mark status={insurance.status} />

                <span className="min-w-0 flex-1">
                  <b className="text-text text-caption block font-medium">
                    {insurance.insuranceName}
                  </b>
                  <span className="text-text-muted block text-[10.5px]">
                    {INSURANCE_STATUS_LABEL[insurance.status]}
                  </span>
                </span>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="text-text-disabled size-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </MiniPanel>

      <InsuranceDetailModal
        insurance={selected}
        onChangeStatus={changeStatus}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
