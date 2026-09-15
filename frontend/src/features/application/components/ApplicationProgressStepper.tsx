import { getApplicationProgress } from '@/features/application/model/progress'
import type { ApplicationListItem } from '@/features/application/model/types'
import ProgressStepper from '@/shared/ui/ProgressStepper'

interface ApplicationProgressStepperProps {
  application: ApplicationListItem
}

/**
 * 신청 한 건의 진행 사항 (S15P21D101-174)
 *
 * 카드의 '진행 사항 보기' 를 누르면 펼쳐지는 자리다. 상태에서 단계를 계산하는 일은
 * model/progress 가 하고, 여기서는 공용 스텝퍼에 넘기기만 한다.
 *
 * 반려돼도 스텝퍼를 그린다. 어디까지 갔다가 막혔는지가 사유만큼 중요하다.
 */
export default function ApplicationProgressStepper({
  application,
}: ApplicationProgressStepperProps) {
  const { steps, doneCount, failedIndex } = getApplicationProgress(application)

  return <ProgressStepper steps={steps} doneCount={doneCount} failedIndex={failedIndex} />
}
