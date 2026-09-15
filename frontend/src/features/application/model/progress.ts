import { formatApplicationDateShort } from '@/features/application/model/date'
import type { ApplicationListItem } from '@/features/application/model/types'
import type { ApplicationStatus } from '@/shared/types/application'
import type { ProgressStep } from '@/shared/ui/ProgressStepper'

/**
 * 신청 진행 4단계 (S15P21D101-174)
 *
 * status 하나에서 파생한다. 단계마다 필드를 두지 않는 이유는 그럴 필요가 없어서다 —
 * 상태가 곧 '어디까지 왔는가' 다.
 *
 * ⚠️ 날짜는 접수와 승인에만 붙는다. 서버가 추적하는 시각이 subject_at 과 complete_at
 *    둘뿐이라, 서류 검토가 언제 끝났는지 계좌 입금이 언제 됐는지는 알 수 없다.
 */
const STEP_KEYS = ['RECEIVED', 'REVIEWING', 'APPROVAL', 'PAYOUT'] as const

const STEP_LABELS: Record<(typeof STEP_KEYS)[number], string> = {
  RECEIVED: '접수',
  REVIEWING: '서류 검토',
  APPROVAL: '승인',
  PAYOUT: '계좌 입금',
}

/**
 * 반려가 나는 단계.
 *
 * 서버는 status = REJECTED 만 주고 어느 단계에서 막혔는지는 알려주지 않는다. 그런데
 * 우리 흐름에서 반려가 날 수 있는 곳은 서류 검토뿐이다 — 접수는 우리가 만드는 단계고,
 * 승인 이후의 번복은 반려가 아니라 다른 사건이다.
 *
 * 서버가 rejected_step 을 주기 시작하면 이 상수 대신 그 값을 쓰면 된다.
 */
const REJECTED_AT = STEP_KEYS.indexOf('REVIEWING')

/** 상태별로 몇 단계까지 지났는지 */
const DONE_COUNT: Record<ApplicationStatus, number> = {
  // 아직 제출 전이라 목록에 오지 않는다. 표를 빠짐없이 채우려고 둔다
  PREPARING: 0,
  SUBMITTED: 1,
  REVIEWING: 2,
  APPROVED: 3,
  PAID: 4,
  // 서류 검토에서 막혔다. 접수까지만 지난 것으로 본다
  REJECTED: 1,
}

export interface ApplicationProgress {
  steps: ProgressStep[]
  doneCount: number
  failedIndex: number | null
}

export function getApplicationProgress(application: ApplicationListItem): ApplicationProgress {
  const { status, subjectAt, completeAt } = application
  const rejected = status === 'REJECTED'

  const steps: ProgressStep[] = STEP_KEYS.map((key) => ({
    key,
    label: STEP_LABELS[key],
    note: noteOf(key, status, subjectAt, completeAt),
  }))

  return {
    steps,
    doneCount: DONE_COUNT[status],
    failedIndex: rejected ? REJECTED_AT : null,
  }
}

/**
 * 점 아래 문구. 추적되는 시각이 있는 단계에만 붙는다.
 *
 * 반려된 건의 complete_at 은 '승인' 이 아니라 '반려' 시각이라 승인 칸에 붙이면 안 된다.
 */
function noteOf(
  key: (typeof STEP_KEYS)[number],
  status: ApplicationStatus,
  subjectAt: string,
  completeAt: string | null,
): string | null {
  if (key === 'RECEIVED') return `${formatApplicationDateShort(subjectAt)} 완료`

  if (key === 'APPROVAL' && completeAt && status !== 'REJECTED') {
    return `${formatApplicationDateShort(completeAt)} 완료`
  }

  return null
}
