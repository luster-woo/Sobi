import { cn } from '@/shared/utils/cn'

export interface ProgressStep {
  key: string
  label: string
  /**
   * 점 아래에 붙는 문구. '8. 21 완료' 처럼.
   *
   * 단계마다 시각을 추적할 수 있는 건 아니라서 없을 수 있다. 없으면 점과 라벨만 그린다 —
   * 빈자리를 '-' 로 채우면 값이 있는데 비어 있는 것처럼 보인다.
   */
  note?: string | null
}

interface ProgressStepperProps {
  steps: ProgressStep[]
  /**
   * 몇 번째 단계까지 지났는지. 0 이면 아무것도 안 지난 것이고, steps.length 면 전부 끝났다.
   * 진행 중인 단계를 따로 표시하지 않는다 — 언제 시작했는지 알 수 없어서 '진행 중' 이라고
   * 쓸 근거가 없다.
   */
  doneCount: number
  /**
   * 여기서 막혔다고 표시할 단계. 반려처럼 더 나아가지 못한 경우에 쓴다.
   * 이 점만 위험 색으로 그린다. 선은 지나온 길이라 완료 색 그대로 둔다.
   */
  failedIndex?: number | null
  className?: string
}

/**
 * 가로 진행 스텝퍼.
 *
 * 마이데이터 수집에 쓰는 StepList 와 다르다. 그쪽은 세로 목록에 단계별 상태(진행 중·실패)가
 * 다 오는 폴링 화면이고, 이쪽은 어디까지 왔는지만 한 줄로 보여준다.
 *
 * 연결선을 칸마다 따로 그린다. 전체를 가로지르는 선 하나로 그리면 지나온 구간만 초록으로
 * 칠할 수가 없다.
 *
 * 칸 너비가 같아서 왼쪽으로 반 칸(-50%)이 앞 점의 중심, 오른쪽 50% 가 자기 점의 중심이다.
 * 거기서 양쪽으로 점 반지름(9px)만큼 물러나면 선이 점 테두리에 딱 닿는다. 중심까지 그리면
 * 선이 점 안으로 파고들고, 다음 칸의 절대 요소라 앞 점 위에 겹쳐 그려진다.
 *
 * 지나온 선은 점 테두리와 같은 3px 로 긋는다. 1px 이면 점만 굵고 선은 가늘어서 따로 노는
 * 것처럼 보인다. 아직 안 지난 구간은 1px 그대로 둔다 — 굵기 차이가 곧 진행 여부다.
 */
export default function ProgressStepper({
  steps,
  doneCount,
  failedIndex = null,
  className,
}: ProgressStepperProps) {
  return (
    <ol className={cn('flex', className)}>
      {steps.map((step, index) => {
        const failed = index === failedIndex
        const done = index < doneCount
        /* 선 색 기준. 막힌 단계도 거기까지는 진행된 것이라 이어진 것으로 본다 */
        const reached = done || failed

        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  // top 은 점의 세로 중심(9px). 두께가 달라져도 -translate-y-1/2 가 맞춰 준다
                  'absolute top-[9px] right-[calc(50%+9px)] left-[calc(-50%+9px)] -translate-y-1/2',
                  // 막힌 단계까지도 실제로 지나온 길이다. 선은 초록으로 두고 점만 빨갛게 한다
                  reached ? 'bg-primary h-[3px]' : 'bg-border h-px',
                )}
              />
            )}

            {/* 선보다 뒤에 오는 형제라서 position 을 주면 점이 선 위에 그려진다 */}
            <span
              className={cn(
                'relative z-10 flex size-[18px] items-center justify-center rounded-full border-[3px]',
                failed
                  ? 'border-danger bg-danger-soft'
                  : done
                    ? 'border-primary bg-primary-soft'
                    : 'border-border-strong bg-surface',
              )}
            />

            <span
              className={cn(
                'text-body2 text-center font-semibold break-keep',
                failed ? 'text-danger' : done ? 'text-text' : 'text-text-muted',
              )}
            >
              {step.label}
            </span>

            {step.note && (
              <span className="text-caption text-text-secondary -mt-1 text-center">
                {step.note}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
