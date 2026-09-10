import { useId, useState } from 'react'
import { useNavigate } from 'react-router'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter'
import { useCountdown } from '@/features/auth/hooks/useCountdown'
import { ROUTES } from '@/shared/constants/routes'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import {
  validateAuthCode,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '@/shared/utils/validators'

/** 인증번호 유효시간(초). 서버 정책이 확정되면 맞춰야 한다 */
const CODE_TTL_SECONDS = 300

const MESSAGE = {
  codeSent: '인증 코드를 보냈어요. 메일을 확인해 주세요.',
  verified: '인증이 완료됐어요',
  needVerify: '이메일 인증을 완료해 주세요.',
  spamHint: '이메일이 오지 않았나요? 스팸함을 확인해 주세요',
} as const

type Errors = Partial<Record<'email' | 'code' | 'password' | 'passwordConfirm', string>>

/**
 * 비로그인 상태의 비밀번호 재설정. 로그인 상태의 변경은 마이페이지(`/user/password`)다.
 *
 * 흐름: `/auth/email/send` → `/auth/email/verify/reset` → `/auth/password/reset`
 * 두 번째 단계가 `resetToken` 을 돌려주고, 마지막 요청 body 에 그 값을 실어야 한다.
 * 회원가입의 `/auth/email/verify` 와 다른 엔드포인트다.
 */
export function PasswordResetPage() {
  const navigate = useNavigate()
  const emailFieldId = useId()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [codeSent, setCodeSent] = useState(false)
  /** `/auth/email/verify/reset` 응답의 resetToken. 이 값이 있으면 인증을 통과한 것이다 */
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const { remaining, running, start, stop } = useCountdown()

  const verified = resetToken !== null

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  const handleSendCode = () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setErrors((previous) => ({ ...previous, email: emailError }))
      return
    }

    // TODO(138): POST /auth/email/send { email }
    //   가입되지 않은 이메일이어도 계정 존재 여부가 드러나지 않게 같은 응답을 준다.
    //   서버가 그렇게 처리하는지 확인 필요
    setCodeSent(true)
    setResetToken(null)
    setCode('')
    start(CODE_TTL_SECONDS)
  }

  const handleVerifyCode = () => {
    const codeError = validateAuthCode(code)
    if (codeError) {
      setErrors((previous) => ({ ...previous, code: codeError }))
      return
    }

    // TODO(138): POST /auth/email/verify/reset { email, verificationCode }
    //   → data { verified, resetToken }. verified 가 false 면 resetToken 이 null 이므로
    //   VALIDATION_MESSAGE.authCodeInvalid 를 code 에 세운다
    setResetToken('mock-reset-token')
    stop()
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const next: Errors = {
      email: validateEmail(email) ?? undefined,
      code: verified ? undefined : MESSAGE.needVerify,
      password: validatePassword(password) ?? undefined,
      passwordConfirm: validatePasswordConfirm(passwordConfirm, password) ?? undefined,
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    // TODO(138): POST /auth/password/reset { resetToken, newPassword: password }
    //   성공 토스트 후 로그인 화면으로 보낸다
    navigate(ROUTES.LOGIN)
  }

  return (
    <div className="border-border bg-surface w-full max-w-[424px] rounded-md border px-7 pt-6.5 pb-7">
      <h1 className="font-heading text-text mb-6 text-[20px] font-bold">새 비밀번호 설정</h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* 라벨을 Input 에 넘기면 오른쪽 버튼이 라벨 높이까지 포함해 어긋난다 */}
        <div>
          <label
            htmlFor={emailFieldId}
            className="font-heading text-body2 text-text mb-2 block font-semibold"
          >
            아이디 (이메일)
            <span className="text-danger ml-0.5">*</span>
          </label>

          <div className="flex items-start gap-2">
            <Input
              id={emailFieldId}
              className="min-w-0 flex-1"
              type="email"
              autoComplete="username"
              placeholder="가입한 이메일 주소"
              disabled={verified}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setCodeSent(false)
                setResetToken(null)
                stop()
                clearError('email')
              }}
              error={errors.email}
            />

            <Button
              variant="outline"
              onClick={handleSendCode}
              disabled={verified || running}
              className="w-[116px] shrink-0 whitespace-nowrap"
            >
              {codeSent ? '재발송' : '코드 발송'}
            </Button>
          </div>
        </div>

        {codeSent && (
          <AuthCodeField
            className="mt-5"
            label="인증 코드"
            value={code}
            onChange={(next) => {
              setCode(next)
              clearError('code')
            }}
            remaining={remaining}
            actionLabel="확인"
            onAction={handleVerifyCode}
            verified={verified}
            error={errors.code}
            helperText={verified ? MESSAGE.verified : MESSAGE.codeSent}
          />
        )}

        <div className="mt-5">
          <Input
            label="새 비밀번호"
            required
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              clearError('password')
            }}
            error={errors.password}
            helperText="영문·숫자·특수문자 조합 8자 이상"
          />
          <PasswordStrengthMeter password={password} className="mt-2" />
        </div>

        <Input
          className="mt-5"
          label="새 비밀번호 확인"
          required
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(event) => {
            setPasswordConfirm(event.target.value)
            clearError('passwordConfirm')
          }}
          error={errors.passwordConfirm}
          helperText={
            passwordConfirm && passwordConfirm === password
              ? VALIDATION_MESSAGE.passwordMatched
              : undefined
          }
        />

        <Button type="submit" className="mt-6 w-full">
          비밀번호 변경
        </Button>
      </form>

      <p className="text-caption text-text-muted mt-3 text-center">{MESSAGE.spamHint}</p>
    </div>
  )
}
