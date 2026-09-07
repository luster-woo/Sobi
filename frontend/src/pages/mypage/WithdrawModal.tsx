import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import { IconAlert } from '@/components/common/Icon'
import Modal from '@/components/common/Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

/** 18-2. 회원 탈퇴 확인 모달 */
export default function WithdrawModal({ open, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="" className="max-w-[520px]">
      <div className="-mt-10 flex flex-col items-center text-center">
        <span className="bg-bg text-text-secondary inline-flex size-11 items-center justify-center rounded-full">
          <IconAlert size={22} />
        </span>
        <h2 className="typo-h2 mt-4">정말 탈퇴하시겠어요?</h2>
        <p className="typo-body2 text-text-secondary mt-2">
          탈퇴하면 아래 정보가 모두 삭제되고 복구할 수 없어요,
        </p>
      </div>

      <Card variant="flat" className="mt-5 rounded-md p-4">
        <ul className="typo-body2 text-text-secondary space-y-1">
          <li>·마이데이터 연동 및 수집된 금융 정보</li>
          <li>·신청 이력 4건·관심 목록 4건</li>
          <li>·작성 중인 서류와 자격 판정 결과</li>
        </ul>
      </Card>

      <div className="typo-body2 text-text mt-4 space-y-2">
        <p>
          진행 중인 신청 1건은 탈퇴해도 기관 심사가 계속돼요. 취소하려면 신청 현황에서 먼저 철회해
          주세요.
        </p>
        <p>
          상환 중인 대출 2건은 취급 기관과 맺은 계약이라 탈퇴해도 유지되고 자동이체도 계속 출금돼요.
          다만 상환 관리 화면은 볼 수 없게 됩니다.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={onClose}>
          돌아가기
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          탈퇴하기
        </Button>
      </div>
    </Modal>
  )
}
