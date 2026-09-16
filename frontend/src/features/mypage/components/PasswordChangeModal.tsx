import { useState } from 'react'

import { useChangePassword } from '@/features/mypage/hooks/useUserAccount'
import { getErrorMessage, getErrorStatus } from '@/shared/api/errors'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'
import { validatePassword, validatePasswordConfirm } from '@/shared/utils/validators'

interface PasswordChangeModalProps {
  open: boolean
  onClose: () => void
}

type Errors = Partial<Record<'next' | 'confirm', string>>

/**
 * 비밀번호 변경.
 *
 * ⚠️ **현재 비밀번호를 묻지 않는다.** 원래는 받았는데, 백엔드
 *    `PasswordChangeReqeust` 에 그 필드가 없어서 입력받아도 보낼 곳이 없었다.
 *    검증되지 않는 칸은 사용자에게 본인 확인을 했다는 착각만 준다 — 자리를 비운 사이
 *    남이 바꾸는 것을 실제로 막지 못하면서 막는 것처럼 보이는 쪽이 더 나쁘다.
 *
 *    백엔드에 `currentPassword` 가 생기면 입력칸을 되살리고 같이 보낸다.
 */
export default function PasswordChangeModal({ open, onClose }: PasswordChangeModalProps) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const showToast = useUiStore((s) => s.showToast)
  const { mutate: submit, isPending } = useChangePassword()

  const close = () => {
    setNext('')
    setConfirm('')
    setErrors({})
    onClose()
  }

  const handleSubmit = () => {
    const validated: Errors = {
      next: validatePassword(next) ?? undefined,
      confirm: validatePasswordConfirm(confirm, next) ?? undefined,
    }

    setErrors(validated)
    if (Object.values(validated).some(Boolean)) return

    submit(next, {
      onSuccess: () => {
        showToast('비밀번호를 바꿨어요.')
        close()
      },
      /*
       * 실패해도 닫지 않는다. 닫아 버리면 방금 적은 값이 사라져 처음부터 다시 쳐야 한다.
       * 어느 칸의 문제도 아니라(화면 검증은 이미 통과했다) 새 비밀번호 칸 아래에 붙인다.
       *
       * 네트워크 끊김·5xx 는 문구를 넣지 않는다. `client.ts` 인터셉터가 이미 토스트를
       * 띄우고 있어서, 같은 말이 칸 아래와 토스트로 두 번 나온다. 창은 그대로 열려 있어
       * 다시 누를 수 있다 (`notifyUnrecoverable` 주석).
       */
      onError: (error) => {
        const status = getErrorStatus(error)
        if (status === undefined || status >= 500) return

        setErrors({ next: getErrorMessage(error, { 401: '다시 로그인한 뒤 시도해 주세요.' }) })
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="비밀번호 수정"
      description="8자 이상, 영문·숫자·특수문자를 섞어 주세요."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleSubmit} loading={isPending}>
            변경하기
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="새 비밀번호"
          required
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => {
            setNext(event.target.value)
            setErrors((previous) => ({ ...previous, next: undefined }))
          }}
          error={errors.next}
        />

        <Input
          label="새 비밀번호 확인"
          required
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value)
            setErrors((previous) => ({ ...previous, confirm: undefined }))
          }}
          error={errors.confirm}
          helperText={confirm && confirm === next ? VALIDATION_MESSAGE.passwordMatched : undefined}
        />
      </div>
    </Modal>
  )
}
