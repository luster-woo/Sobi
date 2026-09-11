import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface WithdrawModalProps {
  open: boolean
  onClose: () => void
  /** 진행 중인 신청 건수. 0 이면 그 경고를 띄우지 않는다 */
  applicationInProgress: number
  /** 상환 중인 대출 건수 */
  repayingLoans: number
  favoriteCount: number
}

/**
 * 회원 탈퇴 확인 (시안 18-2).
 *
 * 무엇이 지워지는지 먼저 보여준다. "정말요?" 만 묻는 창은 사용자가 무엇을 잃는지
 * 모른 채 누르게 만든다.
 *
 * 진행 중인 신청과 상환 중인 대출을 따로 경고하는 이유: 둘 다 탈퇴해도 사라지지
 * 않는다. 기관 심사와 대출 계약은 이 서비스 바깥에 있어서, 탈퇴하면 오히려
 * 들여다볼 수단만 없어진다. 이걸 모르고 탈퇴하면 연체로 이어질 수 있다.
 *
 * 오버레이 클릭으로 닫히지 않게 했다 — 실수로 닫히는 것보다 실수로 눌리는 쪽이
 * 훨씬 위험한 창이라 닫는 길은 명시적인 두 버튼뿐이다.
 */
export default function WithdrawModal({
  open,
  onClose,
  applicationInProgress,
  repayingLoans,
  favoriteCount,
}: WithdrawModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="정말 탈퇴하시겠어요?"
      description="탈퇴하면 아래 정보가 모두 삭제되고 복구할 수 없어요."
      /*
       * 기본 440px 에서는 경고 문장이 세 줄로 끊겨 '진행 중인 신청 1건' 같은 덩어리가
       * 줄바꿈에 걸린다. 읽고 판단해야 하는 창이라 넓은 쪽이 맞다.
       */
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            돌아가기
          </Button>
          {/* TODO: POST /user/me (명세상 탈퇴가 POST 다) → 성공 시 세션 정리 후 랜딩으로 */}
          <Button variant="danger" className="flex-1">
            탈퇴하기
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/*
         * 3열로 눕히면 항목마다 길이가 달라 첫 칸만 두 줄로 접힌다. 세로로 쌓되
         * 가운뎃점을 붙여 목록임을 드러낸다.
         */}
        <ul className="bg-surface-muted text-body2 text-text-secondary space-y-1 rounded-sm px-4 py-3 leading-[1.7]">
          <li className="before:text-text-disabled before:mr-1.5 before:content-['·']">
            마이데이터 연동 및 수집된 금융 정보
          </li>
          <li className="before:text-text-disabled before:mr-1.5 before:content-['·']">
            자격 판정 결과와 작성 중인 서류
          </li>
          <li className="before:text-text-disabled before:mr-1.5 before:content-['·']">
            관심 목록 {favoriteCount}건
          </li>
        </ul>

        {/*
         * 문장 단위로 줄을 나눈다. 흘려 쓰면 '…계속돼요. 취소하려면…' 이 한 줄에 붙어
         * 어디서 다음 이야기가 시작되는지 눈으로 잡히지 않는다. 탈퇴 전에 읽고
         * 판단해야 하는 내용이라 한 줄에 한 문장씩이 낫다.
         */}
        {applicationInProgress > 0 && (
          <div className="text-body2 text-text-secondary space-y-0.5 leading-[1.8]">
            <p>
              <b className="text-text font-medium whitespace-nowrap">
                진행 중인 신청 {applicationInProgress}건
              </b>
              은 탈퇴해도 기관 심사가 계속돼요.
            </p>
            <p>취소하려면 신청 현황에서 먼저 철회해 주세요.</p>
          </div>
        )}

        {repayingLoans > 0 && (
          <div className="text-body2 text-text-secondary space-y-0.5 leading-[1.8]">
            <p>
              <b className="text-text font-medium whitespace-nowrap">
                상환 중인 대출 {repayingLoans}건
              </b>
              은 취급 기관과 맺은 계약이라 탈퇴해도 유지되고 자동이체도 계속 출금돼요.
            </p>
            <p>다만 상환 관리 화면은 볼 수 없게 됩니다.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
