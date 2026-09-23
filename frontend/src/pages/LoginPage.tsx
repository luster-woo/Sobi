import { useState } from 'react'
import { Link, type Location, useLocation, useNavigate } from 'react-router'

import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton'
import OrDivider from '@/features/auth/components/OrDivider'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { buildAuthorizeUrl, isGoogleOAuthConfigured } from '@/features/auth/model/googleOAuth'
import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Input from '@/shared/ui/Input'
import { validateEmail } from '@/shared/utils/validators'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  /** ProtectedRoute 가 넘겨준 원래 목적지. 없으면 대시보드 */
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? ROUTES.DASHBOARD

  const { mutate: signIn, isPending } = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  /**
   * 서버는 어느 칸이 틀렸는지 알려주지 않는다. 그래서 폼 아래에 한 줄로 붙인다.
   * 소셜 로그인이 실패하면 콜백 화면이 여기로 돌려보내면서 문구를 실어준다.
   */
  const [signInError, setSignInError] = useState<string | null>(
    (location.state as { authError?: string } | null)?.authError ?? null,
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const nextEmailError = validateEmail(email)
    // 로그인은 형식 검증을 하지 않는다. 규칙이 바뀌기 전에 만든 계정이 못 들어오게 된다
    const nextPasswordError = password ? null : VALIDATION_MESSAGE.required

    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setSignInError(null)

    if (nextEmailError || nextPasswordError) return

    // TODO(135): keepSignedIn 은 서버 계약이 없다 — refreshToken 쿠키 Max-Age 로 다룰지 확인 필요
    signIn(
      { email, password },
      {
        onSuccess: () => navigate(from, { replace: true }),
        onError: (error) => {
          /*
           * AUTH_009 하나에 세 상황이 들어온다 — 비밀번호 틀림, 없는 계정, 소셜 계정.
           * 서버가 일부러 뭉쳐서 화면도 구분하지 않는다. 나머지(네트워크·500)는
           * 서버 문구를 그대로 보여준다.
           */
          const message =
            getErrorCode(error) === ERROR_CODE.LOGIN_FAILED
              ? VALIDATION_MESSAGE.loginFailed
              : getErrorMessage(error)

          setSignInError(message)
        },
      },
    )
  }

  return (
    <>
      <div className="border-border bg-surface w-full max-w-[424px] rounded-md border px-7 pt-6.5 pb-7">
        <h1 className="text-h2 mb-6 tracking-[-0.02em]">로그인</h1>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="아이디"
            type="email"
            autoComplete="username"
            placeholder="이메일 주소"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(null)
            }}
            error={emailError ?? undefined}
          />

          <Input
            className="mt-5"
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(null)
            }}
            error={passwordError ?? undefined}
          />

          <div className="mt-4 flex items-center justify-between gap-2.5">
            <Checkbox
              label="로그인 유지"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
            />

            <Link
              to={ROUTES.PASSWORD_RESET}
              className="text-body2 text-text-secondary hover:text-text font-medium hover:underline"
            >
              비밀번호 찾기
            </Link>
          </div>

          {signInError && <p className="text-body2 text-danger mt-4">{signInError}</p>}

          <Button type="submit" loading={isPending} className="mt-5 w-full">
            로그인
          </Button>
        </form>

        <OrDivider />

        {/* 구글 동의 화면으로 나간다. 돌아오는 곳은 ROUTES.OAUTH_CALLBACK */}
        <GoogleAuthButton
          label="계속하기"
          disabled={!isGoogleOAuthConfigured()}
          onClick={() => {
            window.location.assign(buildAuthorizeUrl())
          }}
        />
      </div>

      {/* 가입은 약관 동의(03)부터 시작한다.
          px-7 은 카드 내부 패딩과 같은 값이다 — 이게 없으면 '회원가입' 이
          '비밀번호 찾기' 보다 28px 오른쪽으로 튀어나가 세로선이 안 맞는다 */}
      <p className="text-body2 text-text-muted mt-3.5 flex w-full max-w-[424px] items-baseline justify-between gap-2.5 px-7">
        <span>아직 계정이 없으신가요?</span>
        <Link to={ROUTES.TERMS} className="text-primary font-semibold hover:underline">
          회원가입
        </Link>
      </p>
    </>
  )
}
