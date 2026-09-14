import { useId, useState } from 'react'
import { useNavigate } from 'react-router'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter'
import { useCountdown } from '@/features/auth/hooks/useCountdown'
import { useSendResetCode, useVerifyResetCode } from '@/features/auth/hooks/usePasswordReset'
import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'
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

/** 인증번호 유효시간(초). 서버 Redis TTL 과 맞춰야 한다 */
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

  const { mutate: sendCode, isPending: sending } = useSendResetCode()
  const { mutate: verifyCode, isPending: verifying } = useVerifyResetCode()

  const verified = resetToken !== null

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  const setError = (field: keyof Errors, message: string) =>
    setErrors((previous) => ({ ...previous, [field]: message }))

  const handleSendCode = () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setError('email', emailError)
      return
    }

    sendCode(email, {
      onSuccess: (registered) => {
        // 가입되지 않은 주소면 메일도 안 나갔다. 코드 칸을 열지 않고 이메일에 붙인다
        if (!registered) {
          setError('email', VALIDATION_MESSAGE.emailNotRegistered)
          return
        }

        setCodeSent(true)
        setResetToken(null)
        setCode('')
        start(CODE_TTL_SECONDS)
      },
      onError: (error) => {
        const message =
          getErrorCode(error) === ERROR_CODE.MAIL_COOLDOWN
            ? VALIDATION_MESSAGE.emailSendCooldown
            : getErrorMessage(error)

        setError('email', message)
      },
    })
  }

  const handleVerifyCode = () => {
    const codeError = validateAuthCode(code)
    if (codeError) {
      setError('code', codeError)
      return
    }

    verifyCode(
      { email, verificationCode: code },
      {
        onSuccess: (token) => {
          setResetToken(token)
          stop()
        },
        onError: (error) => {
          const errorCode = getErrorCode(error)

          /*
           * 소셜 계정은 비밀번호가 없어 재설정할 것이 없다. 유일하게 이메일 칸에
           * 붙이는 에러다 — 고칠 것이 인증번호가 아니라 로그인 방법이라서다.
           */
          if (errorCode === ERROR_CODE.SOCIAL_RESET_NOT_ALLOWED) {
            setError(
              'email',
              'Google로 가입한 계정이에요. 로그인 화면에서 Google로 계속하기를 눌러주세요.',
            )
            stop()
            return
          }

          /*
           * ⚠️ AUTH_003 이 두 상황을 겸한다 — 진짜 만료와 **없는 계정**이다.
           *    서버가 가입 여부를 숨기려고 같은 코드를 쓰기 때문에 화면도 구분할 수 없다.
           *    "만료됐다" 로만 쓰면 방금 코드를 받은 사람에게 앞뒤가 안 맞아서
           *    두 상황을 다 포괄하는 문구를 쓴다.
           *
           *    카운트다운은 멈추지 않는다. 실제로는 아직 유효할 수 있고,
           *    멈춰버리면 "만료됐다" 를 화면이 단정하는 꼴이 된다.
           */
          if (errorCode === ERROR_CODE.CODE_EXPIRED) {
            setError('code', VALIDATION_MESSAGE.authCodeInvalidOrExpired)
            return
          }

          setError(
            'code',
            errorCode === ERROR_CODE.CODE_MISMATCH
              ? VALIDATION_MESSAGE.authCodeInvalid
              : getErrorMessage(error),
          )
        },
      },
    )
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
                setCode('')
                stop()

                /*
                 * 이메일을 바꾸면 이전 주소로 받은 코드는 의미가 없다. 입력값과 에러를
                 * 같이 지운다 — 안 지우면 코드 칸이 비었는데 "인증번호가 올바르지 않다"
                 * 가 남아 방금 뭘 잘못했나 싶어진다.
                 */
                clearError('email')
                clearError('code')
              }}
              error={errors.email}
            />

            <Button
              variant="outline"
              onClick={handleSendCode}
              loading={sending}
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
            actionLabel={verifying ? '확인 중' : '확인'}
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
