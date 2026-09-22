import MatchResultPanel from '@/features/mydata/components/MatchResultPanel'
import type { MydataLinkResult } from '@/features/mydata/model/types'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface RefreshResultModalProps {
  /** 갱신 응답. null 이면 닫혀 있다 */
  result: MydataLinkResult | null
  onClose: () => void
}

/**
 * 수동 갱신 뒤 다시 판정한 결과. 판정 화면의 결과 카드를 그대로 쓴다.
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
      {result && <MatchResultPanel result={result} />}
    </Modal>
  )
}
