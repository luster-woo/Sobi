import { useId, useState } from 'react'
import { useNavigate } from 'react-router'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton'
import OrDivider from '@/features/auth/components/OrDivider'
import { useCountdown } from '@/features/auth/hooks/useCountdown'
import { useSendEmailCode, useSignUp, useVerifyEmailCode } from '@/features/auth/hooks/useSignUp'
import { buildAuthorizeUrl, isGoogleOAuthConfigured } from '@/features/auth/model/googleOAuth'
import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import {
  validateAuthCode,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateRequired,
} from '@/shared/utils/validators'

/** 인증번호 유효시간(초). 서버 Redis TTL 과 맞춰야 한다 */
const CODE_TTL_SECONDS = 300

const MESSAGE = {
  codeSent: '인증 코드를 보냈어요. 메일을 확인해 주세요.',
  emailAvailable: '사용할 수 있는 이메일입니다',
  verified: '인증이 완료됐어요',
  needVerify: '이메일 인증을 완료해 주세요.',
} as const

type Errors = Partial<Record<'name' | 'email' | 'code' | 'password' | 'passwordConfirm', string>>

export function SignUpPage() {
  const navigate = useNavigate()
  const emailFieldId = useId()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const { remaining, running, start, stop } = useCountdown()
  const showToast = useUiStore((s) => s.showToast)

  const { mutate: sendCode, isPending: sending } = useSendEmailCode()
  const { mutate: verifyCode, isPending: verifying } = useVerifyEmailCode()
  const { mutate: submitSignUp, isPending: submitting } = useSignUp()

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
      onSuccess: (available) => {
        // 중복은 에러가 아니라 정상 응답이다. 메일도 안 나갔으니 코드 칸을 열지 않는다
        if (!available) {
          setError('email', VALIDATION_MESSAGE.emailDuplicated)
          return
        }

        setCodeSent(true)
        setVerified(false)
        setCode('')
        start(CODE_TTL_SECONDS)
      },
      onError: (error) => {
        // 1분 쿨다운(429). 남은 시간을 서버가 주지 않아 문구로만 안내한다
        const message =
          getErrorCode(error) === ERROR_CODE.MAIL_COOLDOWN
            ? '잠시 후 다시 시도해 주세요.'
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
        onSuccess: () => {
          setVerified(true)
          stop()
        },
        /*
         * 만료·불일치가 200 이 아니라 400 으로 온다. 토스트가 아니라 코드 칸 밑에
         * 붙여야 어디를 고쳐야 하는지 바로 보인다.
         */
        onError: (error) => {
          const code = getErrorCode(error)

          if (code === ERROR_CODE.CODE_EXPIRED) {
            setError('code', '인증 시간이 지났어요. 코드를 다시 받아주세요.')
            stop()
            return
          }

          setError(
            'code',
            code === ERROR_CODE.CODE_MISMATCH
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
      name: validateRequired(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      passwordConfirm: validatePasswordConfirm(passwordConfirm, password) ?? undefined,
      code: verified ? undefined : MESSAGE.needVerify,
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    submitSignUp(
      { email, password, name },
      {
        // 응답에 토큰이 없어 자동 로그인이 안 된다. 로그인 화면으로 보낸다
        onSuccess: () => {
          showToast('가입이 완료됐어요. 로그인해 주세요.')
          navigate(ROUTES.LOGIN, { replace: true })
        },
        onError: (error) => {
          const code = getErrorCode(error)

          if (code === ERROR_CODE.EMAIL_DUPLICATED) {
            setError('email', VALIDATION_MESSAGE.emailDuplicated)
            return
          }

          // 인증을 건너뛰었거나 서버 쪽 인증 기록이 만료된 경우
          if (code === ERROR_CODE.EMAIL_NOT_VERIFIED) {
            setVerified(false)
            setError('code', MESSAGE.needVerify)
            return
          }

          showToast(getErrorMessage(error), 'danger')
        },
      },
    )
  }

  return (
    <div className="border-border bg-surface w-full max-w-[424px] rounded-md border px-7 pt-6 pb-6">
      <h1 className="font-heading text-text mb-5 text-[20px] font-bold">회원가입</h1>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="이름"
          required
          autoComplete="name"
          placeholder="실명을 입력해 주세요"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            clearError('name')
          }}
          error={errors.name}
        />

        {/* 라벨을 Input 에 넘기면 오른쪽 버튼이 라벨 높이까지 포함해 어긋난다 */}
        <div className="mt-4">
          <label
            htmlFor={emailFieldId}
            className="font-heading text-body2 text-text mb-1.5 block font-semibold"
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
              placeholder="이메일 주소"
              disabled={verified}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setCodeSent(false)
                setVerified(false)
                stop()
                clearError('email')
              }}
              error={errors.email}
              helperText={codeSent && !errors.email ? MESSAGE.emailAvailable : undefined}
            />

            {/* 문구가 길면 116px 안에서 두 줄로 접힌다. 05 화면과 같은 짧은 문구를 쓴다 */}
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
            className="mt-4"
            label="인증 코드 확인"
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

        <Input
          className="mt-4"
          label="비밀번호"
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

        <Input
          className="mt-4"
          label="비밀번호 확인"
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

        <Button type="submit" loading={submitting} className="mt-5 w-full">
          가입하기
        </Button>
      </form>

      <OrDivider />

      {/* 구글은 가입·로그인이 같은 흐름이다. 처음이면 서버가 isNewUser 로 알려준다 */}
      <GoogleAuthButton
        label="가입"
        disabled={!isGoogleOAuthConfigured()}
        onClick={() => {
          window.location.assign(buildAuthorizeUrl())
        }}
      />
    </div>
  )
}
