import { cn } from '@/shared/utils/cn'

/**
 * 폴링 응답의 단계 상태.
 * `GET /mydata/link/{jobId}` 의 `steps[].status` 를 그대로 받는다.
 */
export type StepStatus = 'DONE' | 'IN_PROGRESS' | 'PENDING' | 'FAILED'

export interface StepItem {
  key: string
  label: string
  status: StepStatus
  /** 오른쪽에 붙는 부가 문구. '2개 기관 완료' 처럼 */
  note?: string | null
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'DONE') {
    return (
      <span className="bg-primary text-text-inverse flex size-[18px] shrink-0 items-center justify-center rounded-full">
        <CheckIcon />
      </span>
    )
  }

  if (status === 'FAILED') {
    return (
      <span className="bg-danger-soft text-danger text-caption flex size-[18px] shrink-0 items-center justify-center rounded-full font-bold">
        !
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'block size-[18px] shrink-0 rounded-full border-2',
        status === 'IN_PROGRESS' ? 'border-primary' : 'border-border-strong',
      )}
    />
  )
}

const NOTE_TEXT: Record<StepStatus, string> = {
  DONE: '완료',
  IN_PROGRESS: '가져오는 중',
  PENDING: '대기',
  FAILED: '실패',
}

interface StepListProps {
  steps: StepItem[]
  className?: string
}

/**
 * 단계별 진행 목록. 마이데이터 수집(09)과 자격 판정(12)이 같이 쓴다.
 *
 * 상태를 스스로 계산하지 않는다 — 서버가 준 배열을 순서대로 그린다. 진행 여부를
 * 화면이 판단하면 서버와 어긋난 순간 사용자가 잘못된 정보를 본다.
 */
export default function StepList({ steps, className }: StepListProps) {
  return (
    <ul className={className}>
      {steps.map((step) => (
        <li
          key={step.key}
          className="border-border-subtle flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
        >
          <StepIcon status={step.status} />

          <span
            className={cn(
              'text-body2 min-w-0 flex-1',
              step.status === 'PENDING' ? 'text-text-muted' : 'text-text',
            )}
          >
            {step.label}
          </span>

          <span
            className={cn(
              'text-caption shrink-0 tabular-nums',
              step.status === 'IN_PROGRESS' && 'text-primary font-medium',
              step.status === 'FAILED' && 'text-danger font-medium',
              (step.status === 'DONE' || step.status === 'PENDING') && 'text-text-muted',
            )}
          >
            {step.note ?? NOTE_TEXT[step.status]}
          </span>
        </li>
      ))}
    </ul>
  )
}
