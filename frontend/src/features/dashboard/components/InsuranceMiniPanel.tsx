import { useState } from 'react'

import InsuranceDetailModal from '@/features/dashboard/components/InsuranceDetailModal'
import MiniPanel from '@/features/dashboard/components/MiniPanel'
import { useInsurances } from '@/features/dashboard/hooks/useInsurance'
import { type DashboardInsurance, INSURANCE_STATUS_LABEL } from '@/features/dashboard/model/types'
import { INSURANCE_STATUS, type InsuranceStatus } from '@/shared/types'
import Badge from '@/shared/ui/Badge'
import Skeleton from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

interface InsuranceMiniPanelProps {
  /**
   * reference 모드에서만 넘긴다. checklist 모드는 `GET /insurance` 로 직접 받아온다 —
   * 상태를 바꾸면 이 패널만 다시 받으면 되고 대시보드 전체를 무효화할 이유가 없다.
   */
  insurances?: DashboardInsurance[]
  /**
   * checklist — 사업자. 항목마다 가입 여부를 판정해 보여주고 사용자가 고칠 수 있다.
   * reference — 예비창업자. 개업 전이라 가입 여부를 판정할 근거가 없다. 상태를 빼고
   *             "이 업종을 하려면 이런 보험이 필요하다" 는 목록으로만 쓴다.
   */
  variant?: 'checklist' | 'reference'
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
export default function InsuranceMiniPanel({
  insurances,
  variant = 'checklist',
}: InsuranceMiniPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const isReference = variant === 'reference'

  /*
   * 훅은 조건 없이 부른다. 예비창업자 화면에서도 호출은 하되 `useInsurances` 안의
   * role 판정이 요청을 막는다 — 서버가 404 를 줄 것이 뻔해서다.
   */
  const { data, isLoading } = useInsurances()

  /* 서버 응답에는 화면이 안 쓰는 필드(insuranceId·info·category)가 더 있다. 여기서 좁힌다 */
  const items: DashboardInsurance[] = isReference ? (insurances ?? []) : (data ?? [])

  /*
   * 객체가 아니라 id 를 들고 있는다. 상태를 바꾼 뒤에도 열린 모달이 최신 값을 본다.
   *
   * 다시 받아온 목록에 그 id 가 없으면 연 적 없던 것으로 친다 — 남겨두면 나중에 항목이
   * 되돌아왔을 때 모달이 저절로 다시 열린다. 렌더 중 setState 지만 조건이 한 번만
   * 참이라 루프가 생기지 않는다(React 의 '렌더 중 상태 조정' 패턴).
   */
  const selected = items.find((item) => item.insuranceChecklistId === selectedId) ?? null
  if (selectedId !== null && selected === null) setSelectedId(null)

  /*
   * 참고 목록은 즉시 그려지므로 로딩이 없다. 사업자 쪽만 자리를 잡아둔다.
   *
   * `isPending` 이 아니라 `isLoading` 이다. 꺼진 쿼리(`enabled: false`)는 데이터가 없어
   * `isPending` 이 영영 true 라, 그걸 쓰면 예비 창업자에게 이 패널이 잘못 붙는 순간
   * 스켈레톤이 영구히 남는다. `isLoading` 은 실제로 요청이 나가는 동안만 true 다.
   */
  if (!isReference && isLoading) {
    return (
      <MiniPanel label="업종별 필수 가입 항목" title="의무보험">
        <div role="status" aria-label="의무보험을 불러오는 중" className="space-y-2 py-1">
          <Skeleton variant="text" width="70%" height={13} />
          <Skeleton variant="text" width="55%" height={13} />
          <Skeleton variant="text" width="65%" height={13} />
        </div>
      </MiniPanel>
    )
  }

  /*
   * 업종에 걸린 항목이 없으면 패널째 숨긴다. 실패했을 때도 마찬가지다 — 의무보험은
   * 대시보드의 곁가지라, 못 불러왔다고 에러 상자를 세워두면 본 일을 가린다.
   */
  if (items.length === 0) return null

  return (
    <>
      <MiniPanel
        label="업종별 필수 가입 항목"
        title={isReference ? '의무보험 체크리스트' : '의무보험'}
        aside={isReference ? <Badge variant="outline">참고</Badge> : summaryBadge(items)}
        note={isReference ? '개업하고 나면 가입 여부를 확인해 드려요' : null}
      >
        <ul className="-mx-1.5 flex flex-col">
          {items.map((insurance) => (
            <li key={insurance.insuranceChecklistId}>
              <button
                type="button"
                onClick={() => setSelectedId(insurance.insuranceChecklistId)}
                className="hover:bg-surface-muted focus-visible:outline-primary flex w-full items-center gap-2 rounded-sm px-1.5 py-1.5 text-left transition-colors focus-visible:outline focus-visible:-outline-offset-2"
              >
                {/* 참고 모드에는 상태가 없다. 판정하지 않은 값을 색으로 말하면 안 된다 */}
                {!isReference && <Mark status={insurance.status} />}

                <span className="min-w-0 flex-1">
                  <b className="text-text text-caption block font-medium">{insurance.name}</b>
                  {!isReference && (
                    <span className="text-text-muted block text-[10.5px]">
                      {INSURANCE_STATUS_LABEL[insurance.status]}
                    </span>
                  )}
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
        readOnly={isReference}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
