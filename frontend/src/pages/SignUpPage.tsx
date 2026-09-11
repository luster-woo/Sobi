import { useId, useState } from 'react'
import { useNavigate } from 'react-router'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton'
import OrDivider from '@/features/auth/components/OrDivider'
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
  validateRequired,
} from '@/shared/utils/validators'

/** 인증번호 유효시간(초). 서버 정책이 확정되면 맞춰야 한다 */
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

  const clearError = (field: keyof Errors) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }))

  const handleSendCode = () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setErrors((previous) => ({ ...previous, email: emailError }))
      return
    }

    // TODO(136): GET /auth/email/check?email= → data.isDuplication 이 true 면
    //   VALIDATION_MESSAGE.emailDuplicated 를 email 에 세우고 중단.
    //   통과하면 POST /auth/email/send
    setCodeSent(true)
    setVerified(false)
    setCode('')
    start(CODE_TTL_SECONDS)
  }

  const handleVerifyCode = () => {
    const codeError = validateAuthCode(code)
    if (codeError) {
      setErrors((previous) => ({ ...previous, code: codeError }))
      return
    }

    // TODO(136): POST /auth/email/verify { email, verificationCode }
    //   코드가 틀려도 200 + data.verified: false 로 오므로 토스트가 아니라
    //   VALIDATION_MESSAGE.authCodeInvalid 를 code 에 세운다
    setVerified(true)
    stop()
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

    // TODO(136): POST /auth/signup { email, password, name }
    //   응답에 토큰이 없어서 자동 로그인이 안 된다 — 성공 토스트 후 로그인 화면으로 보낸다
    navigate(ROUTES.LOGIN)
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
            actionLabel="확인"
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

        <Button type="submit" className="mt-5 w-full">
          가입하기
        </Button>
      </form>

      <OrDivider />

      {/* TODO(136): /auth/oauth/{provider} 명세가 다른 프로젝트 템플릿이라 비워둔다 */}
      <GoogleAuthButton label="가입" />
    </div>
  )
}
