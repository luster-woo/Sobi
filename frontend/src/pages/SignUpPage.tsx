import { useId, useState } from 'react'
import { useNavigate } from 'react-router'

import AuthCodeField from '@/features/auth/components/AuthCodeField'
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton'
import OrDivider from '@/features/auth/components/OrDivider'
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter'
import { useCountdown } from '@/features/auth/hooks/useCountdown'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { useSendEmailCode, useSignUp, useVerifyEmailCode } from '@/features/auth/hooks/useSignUp'
import { buildAuthorizeUrl, isGoogleOAuthConfigured } from '@/features/auth/model/googleOAuth'
import { ERROR_CODE, getErrorCode, getErrorMessage, getErrorStatus } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import DatePicker from '@/shared/ui/DatePicker'
import Input from '@/shared/ui/Input'
import { yesterdayIso } from '@/shared/utils/date'
import {
  validateAuthCode,
  validateBirthDate,
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

type Errors = Partial<
  Record<'name' | 'birthDate' | 'email' | 'code' | 'password' | 'passwordConfirm', string>
>

export function SignUpPage() {
  const navigate = useNavigate()
  const emailFieldId = useId()

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [codeSent, setCodeSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const { remaining, running, start, stop } = useCountdown()
  const showToast = useUiStore((s) => s.showToast)
  const setPostAuthRedirect = useAuthStore((s) => s.setPostAuthRedirect)

  const { mutate: sendCode, isPending: sending } = useSendEmailCode()
  const { mutate: verifyCode, isPending: verifying } = useVerifyEmailCode()
  const { mutate: submitSignUp, isPending: signingUp } = useSignUp()
  /* 가입 직후 자동 로그인. 사용자에게는 가입 버튼 하나의 동작이라 로딩도 같이 묶는다 */
  const { mutate: submitLogin, isPending: loggingIn } = useLogin()
  const submitting = signingUp || loggingIn

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
        onSuccess: () => {
          setVerified(true)
          stop()
        },
        /*
         * 만료·불일치가 200 이 아니라 400 으로 온다. 토스트가 아니라 코드 칸 밑에
         * 붙여야 어디를 고쳐야 하는지 바로 보인다.
         */
        onError: (error) => {
          // 입력값 state 인 `code` 와 이름이 겹치지 않게 errorCode 로 둔다
          const errorCode = getErrorCode(error)

          // 가입은 계정이 없는 게 정상이라 AUTH_003 이 진짜 만료뿐이다. 그대로 안내한다
          if (errorCode === ERROR_CODE.CODE_EXPIRED) {
            setError('code', VALIDATION_MESSAGE.authCodeExpired)
            stop()
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
      name: validateRequired(name) ?? undefined,
      birthDate: validateBirthDate(birthDate) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      passwordConfirm: validatePasswordConfirm(passwordConfirm, password) ?? undefined,
      code: verified ? undefined : MESSAGE.needVerify,
    }

    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    submitSignUp(
      { email, password, name, birthDate },
      {
        /*
         * 가입이 끝나면 사업자 인증으로 바로 보낸다. 거기서 사업자·예비 창업자를 고른다.
         *
         * ⚠️ 그 전에 로그인을 한 번 더 태워야 한다. `POST /auth/signup` 응답이
         *    `ApiResponse<Void>` 라 토큰이 없고, `/verify` 는 ProtectedRoute 아래라
         *    토큰 없이 들어가면 로그인 화면으로 튕긴다. 백엔드가 가입 응답에
         *    LoginResponse 를 주게 되면 이 호출을 지우면 된다.
         *
         * 사용자에게는 한 단계로 보인다 — 방금 적은 값을 그대로 쓰므로 다시 물을 게 없다.
         */
        onSuccess: () => {
          /*
           * 갈 곳을 미리 적어두고 로그인을 태운다. 여기서 navigate 를 부르지 않는 이유:
           * 로그인이 성공하는 순간 PublicOnlyRoute 가 authenticated 를 보고 대시보드로
           * 밀어버리는데, `/verify` 는 lazy 라 청크를 받는 동안 라우터가 아직 `/signup`
           * 에 있어서 가드가 이긴다. 이동은 가드 한 곳에서만 일어나게 둔다.
           */
          setPostAuthRedirect(ROUTES.BUSINESS_VERIFY)

          submitLogin(
            { email, password },
            {
              /*
               * 가입은 됐는데 로그인만 실패한 경우다. 가입을 되돌릴 수 없으니
               * 실패로 안내하면 안 된다 — 계정은 있다고 알리고 로그인 화면으로 보낸다.
               */
              onError: () => {
                // 로그인을 못 했으니 예약도 거둔다. 안 그러면 다음 로그인이 /verify 로 샌다
                setPostAuthRedirect(null)
                showToast('가입이 완료됐어요. 로그인해 주세요.')
                navigate(ROUTES.LOGIN, { replace: true })
              },
            },
          )
        },
        onError: (error) => {
          const errorCode = getErrorCode(error)

          // 발송 전에 확인했지만 그 사이 누가 같은 주소로 가입할 수 있다
          if (errorCode === ERROR_CODE.EMAIL_DUPLICATED) {
            setError('email', VALIDATION_MESSAGE.emailDuplicated)
            return
          }

          /*
           * 화면은 인증을 통과했는데 서버 쪽 기록이 없는 경우. 인증 후 한참 뒤에
           * 가입 버튼을 누르면 서버 기록이 먼저 만료된다. 인증 단계로 되돌리되
           * 이전 코드는 지운다 — 이미 소진된 값이다.
           */
          if (errorCode === ERROR_CODE.EMAIL_NOT_VERIFIED) {
            setVerified(false)
            setCode('')
            setError('code', VALIDATION_MESSAGE.authCodeRecordExpired)
            return
          }

          /*
           * 금융망 가입(EXTERNAL_001) 실패 등. 어느 칸의 문제가 아니라 토스트가 맞다.
           *
           * 4xx 만 띄운다 — 네트워크 끊김과 5xx 는 `client.ts` 인터셉터가 이미 토스트를
           * 올려서, 여기서 또 부르면 같은 문구가 두 장 쌓인다.
           */
          const status = getErrorStatus(error)
          if (status !== undefined && status < 500) showToast(getErrorMessage(error), 'danger')
        },
      },
    )
  }

  return (
    <div className="border-border bg-surface w-full max-w-[424px] rounded-md border px-7 pt-6 pb-6">
      <h1 className="text-h2 mb-5 tracking-[-0.02em]">회원가입</h1>

      <form onSubmit={handleSubmit} noValidate>
        {/*
         * 이름과 생년월일을 한 줄에 둔다. 둘 다 본인 확인용이라 묶어 읽히고, 세로로
         * 쌓으면 이메일 인증까지 가기 전에 스크롤이 생긴다.
         *
         * 폭은 반씩 나눈다. 이름이 길이가 제각각이라 처음엔 3:2 로 넓게 줬는데,
         * 그러면 생년월일 칸이 150px 아래로 내려가 달력 버튼이 'YYYY-MM-DD' 를 밀어낸다.
         * 이름은 넘쳐도 잘려 보일 뿐이지만 날짜 칸은 눌러야 하는 버튼이 가려진다.
         *
         * 카드가 424px 라 좁다. 한 칸이 180px 밑으로 내려가면 달력 버튼이 값을 가리므로
         * 그 아래로는 세로로 쌓는다.
         */}
        <div className="flex flex-col gap-4 min-[380px]:flex-row min-[380px]:gap-3">
          <div className="min-w-0 min-[380px]:flex-1">
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
          </div>

          <div className="min-w-0 min-[380px]:flex-1">
            {/* 사업자 인증의 개업연월일과 같은 컴포넌트다. 연 → 월 → 일 순으로 좁혀 고른다 */}
            <DatePicker
              label="생년월일"
              required
              value={birthDate}
              onChange={(value) => {
                setBirthDate(value)
                clearError('birthDate')
              }}
              // 백엔드가 @Past 라 오늘은 못 고르게 막는다
              max={yesterdayIso()}
              error={errors.birthDate}
            />
          </div>
        </div>

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
                setCode('')
                stop()

                // 이메일을 바꾸면 이전 주소로 받은 코드는 의미가 없다. 입력값과 에러를 같이 지운다
                clearError('email')
                clearError('code')
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

        {/* 재설정 화면과 같은 구성이다 — 강도 막대를 Input 바깥에 두고 간격만 맞춘다 */}
        <div className="mt-4">
          <Input
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
          <PasswordStrengthMeter password={password} className="mt-2" />
        </div>

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
