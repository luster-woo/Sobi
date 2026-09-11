import { useState } from 'react'

import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'
import { validatePassword, validatePasswordConfirm } from '@/shared/utils/validators'

interface PasswordChangeModalProps {
  open: boolean
  onClose: () => void
}

type Errors = Partial<Record<'current' | 'next' | 'confirm', string>>

/**
 * 비밀번호 변경.
 *
 * 현재 비밀번호를 같이 받는다. 로그인된 상태라도 자리를 비운 사이 남이 바꿔버릴 수
 * 있어서다.
 *
 * ⚠️ 명세의 `PATCH /user/password` 요청 본문에는 현재 비밀번호가 없다. 화면에서는
 *    받아두고, 백엔드에 필드 추가를 요청해야 한다.
 */
export default function PasswordChangeModal({ open, onClose }: PasswordChangeModalProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const close = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setErrors({})
    onClose()
  }

  const handleSubmit = () => {
    const validated: Errors = {
      current: current ? undefined : '현재 비밀번호를 입력해 주세요.',
      next: validatePassword(next) ?? undefined,
      confirm: validatePasswordConfirm(confirm, next) ?? undefined,
    }

    setErrors(validated)
    if (Object.values(validated).some(Boolean)) return

    // TODO: PATCH /user/password { password } — 성공 토스트 후 닫는다
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="비밀번호 수정"
      description="8자 이상, 영문·숫자·특수문자를 섞어 주세요."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button onClick={handleSubmit}>변경하기</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="현재 비밀번호"
          required
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value)
            setErrors((previous) => ({ ...previous, current: undefined }))
          }}
          error={errors.current}
        />

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
