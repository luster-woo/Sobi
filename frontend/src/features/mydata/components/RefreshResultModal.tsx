import type { MydataLinkResult } from '@/features/mydata/model/types'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface RefreshResultModalProps {
  /** 갱신 응답. null 이면 닫혀 있다 */
  result: MydataLinkResult | null
  onClose: () => void
}

/**
 * 수동 갱신 뒤 다시 판정한 결과. 판정 화면처럼 신청 가능한 개수만 보여준다.
 *
 * 이전 판정 값은 응답에 없어서 늘고 준 것은 보여주지 못한다.
 */
export default function RefreshResultModal({ result, onClose }: RefreshResultModalProps) {
  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="자격을 다시 판정했어요"
      description="최신 금융 정보로 지원사업 요건을 다시 대조했어요."
      footer={<Button onClick={onClose}>확인</Button>}
    >
      {result && (
        <p className="text-h3 text-text">
          {result.eligibleCount > 0
            ? `신청할 수 있는 지원사업 ${result.eligibleCount}개를 찾았어요`
            : '지금 조건에 맞는 지원사업이 없어요'}
        </p>
      )}
    </Modal>
  )
}
