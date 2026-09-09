import { useState } from 'react'
import { Link } from 'react-router'

import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton'
import OrDivider from '@/features/auth/components/OrDivider'
import { ROUTES } from '@/shared/constants/routes'
import { VALIDATION_MESSAGE } from '@/shared/constants/validation'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Input from '@/shared/ui/Input'
import { validateEmail } from '@/shared/utils/validators'

/**
 * 로그인 성공 후 이동할 곳은 대시보드가 아니다. ProtectedRoute 가 `state.from` 으로
 * 원래 목적지를 넘기므로 API 를 붙일 때 아래를 되살려야 한다.
 *
 *    const location = useLocation()
 *    const from = (location.state as { from?: Location } | null)?.from?.pathname
 *      ?? ROUTES.DASHBOARD
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const nextEmailError = validateEmail(email)
    // 로그인은 형식 검증을 하지 않는다. 규칙이 바뀌기 전에 만든 계정이 못 들어오게 된다
    const nextPasswordError = password ? null : VALIDATION_MESSAGE.required

    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) return

    // TODO(135): POST /auth/login → setSession 후 navigate(from, { replace: true })
    //   요청 { email, password } · 응답 data { accessToken, tokenType, expiresIn, user }
    //   keepSignedIn 은 서버 계약이 없다 — refreshToken 쿠키 Max-Age 로 다룰지 확인 필요
  }

  return (
    <>
      <div className="border-border bg-surface w-full max-w-[424px] rounded-md border px-7 pt-6.5 pb-7">
        <h1 className="font-heading text-text mb-6 text-[20px] font-bold">로그인</h1>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="아이디"
            type="email"
            autoComplete="username"
            placeholder="sajang@example.com"
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
              to={ROUTES.PASSWORD_CHANGE}
              className="text-body2 text-text-secondary hover:text-text font-medium hover:underline"
            >
              비밀번호 찾기
            </Link>
          </div>

          <Button type="submit" className="mt-5 w-full">
            로그인
          </Button>
        </form>

        <OrDivider />

        {/* TODO(135): /auth/oauth/{provider} 명세가 다른 프로젝트 템플릿이라 비워둔다 */}
        <GoogleAuthButton label="계속하기" />
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
