import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'

interface SocialLinkModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  /** 계정 이메일. 같은 구글 계정으로만 전환된다 */
  email: string
}

/**
 * 구글 계정 전환 확인.
 *
 * 되돌릴 수 없다. 서버가 password 를 지워서 이후로는 이메일+비밀번호로 못 들어온다.
 * 탈퇴만큼은 아니어도 한 번 묻는 게 맞는 동작이다.
 *
 * 계정 이메일을 보여주는 이유: 서버가 같은 이메일의 구글 계정만 받는다. 동의 화면에서
 * 다른 계정을 고르면 거절당하는데, 그걸 누르기 전에 알려주면 헛걸음이 줄어든다.
 */
export default function SocialLinkModal({ open, onClose, onConfirm, email }: SocialLinkModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Google 계정으로 전환할까요?"
      /*
       * description 을 쓰지 않는다. 제목 바로 아래 붙는 자리라 본문과 줄 간격이 달라서,
       * 같은 성격의 문장 둘이 서로 다른 간격으로 떨어져 보인다. 본문에 모아 둔다.
       */
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">
            돌아가기
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Google로 계속하기
          </Button>
        </>
      }
    >
      {/*
       * 두 문장을 같은 간격으로 쌓는다. 각각 440px 한 줄에 들어가는 길이라
       * 어절 중간에서 끊기지 않는다.
       */}
      <div className="-mt-2 space-y-3.5">
        <div className="text-body2 text-text-secondary space-y-1 leading-[1.7] break-keep">
          <p>전환하면 되돌릴 수 없어요.</p>
          <p>
            비밀번호 대신 <b className="text-text font-medium">Google 계정으로만</b> 로그인해요.
          </p>
        </div>

        {/*
         * 라벨·값·단서 세 줄로 쌓는다. 한 문단에 <br> 로 붙이면 이메일이 본문인지
         * 값인지 구분되지 않아 그냥 긴 문장처럼 읽힌다.
         */}
        <div className="bg-surface-muted rounded-sm px-3.5 py-3">
          <p className="text-caption text-text-muted">연결할 Google 계정</p>
          <p className="text-body2 text-text mt-0.5 font-medium break-all">{email}</p>
          <p className="text-caption text-text-muted mt-2 leading-[1.6] break-keep">
            이 주소와 같은 계정만 연결할 수 있어요.
          </p>
        </div>
      </div>
    </Modal>
  )
}
