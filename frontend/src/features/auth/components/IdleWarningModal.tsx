import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface IdleWarningModalProps {
  /** 남은 시간(ms). null 이면 창을 띄우지 않는다 */
  remainingMs: number | null
  onExtend: () => void
}

/** 'mm:ss'. 남은 시간이 1분 이내라 분은 사실상 0 이지만 형식을 맞춘다 */
function toClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * 유휴 로그아웃 예고 (S15P21D101-395).
 *
 * 말없이 끊지 않는 이유: 이 서비스에서 가장 긴 작업이 서류 작성인데, 30분은 서류 하나
 * 쓰다가 자료를 찾으러 다녀오면 닿는 시간이다. 경고 없이 끊으면 쓰던 내용이 사라지고
 * 사용자는 영문도 모른다.
 *
 * 남은 시간을 초 단위로 보여준다. '곧 로그아웃됩니다' 만으로는 지금 저장해야 하는지
 * 판단할 수 없다.
 *
 * X·ESC 도 연장으로 친다(`onClose={onExtend}`). 창을 닫는다는 것 자체가 화면 앞에
 * 있다는 뜻이고, 닫았는데도 곧 로그아웃되면 사용자는 버튼이 고장난 줄 안다.
 * 오버레이 클릭만 막았다 — 그건 실수로 눌리는 자리다.
 */
export default function IdleWarningModal({ remainingMs, onExtend }: IdleWarningModalProps) {
  if (remainingMs === null) return null

  return (
    <Modal
      open
      // 닫기도 연장이다. 오버레이 클릭만 막아 실수로 닫히는 것을 거른다
      onClose={onExtend}
      closeOnOverlayClick={false}
      title="곧 로그아웃돼요"
      description="자리를 비우신 것 같아요. 계속 사용하시려면 아래 버튼을 눌러주세요."
      footer={
        <Button className="w-full" onClick={onExtend}>
          계속 사용하기
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-1.5 py-2">
        {/* 숫자가 매초 바뀌므로 tabular-nums 로 자릿수를 고정한다. 안 하면 폭이 흔들린다 */}
        <strong
          role="timer"
          aria-live="off"
          className="text-danger text-[34px] font-bold tabular-nums"
        >
          {toClock(remainingMs)}
        </strong>
        <p className="text-body2 text-text-secondary">
          작성 중인 내용이 있다면 먼저 저장해 주세요.
        </p>
      </div>
    </Modal>
  )
}
