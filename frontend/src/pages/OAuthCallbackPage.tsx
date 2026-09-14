import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useOAuthLogin } from '@/features/auth/hooks/useOAuthLogin'
import { useSocialLink } from '@/features/auth/hooks/useSocialLink'
import { consumeOAuthRequest } from '@/features/auth/model/googleOAuth'
import { ERROR_CODE, getErrorCode, getErrorMessage } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Spinner from '@/shared/ui/Spinner'

/** 소셜 연동 충돌은 문구를 따로 준비한다. 서버 메시지가 상황을 다 설명하지 못한다 */
const OAUTH_MESSAGE: Record<string, string> = {
  [ERROR_CODE.OAUTH_ALREADY_LOCAL]:
    '이미 이메일로 가입된 계정이에요. 이메일과 비밀번호로 로그인해주세요.',
  [ERROR_CODE.OAUTH_ALREADY_LINKED]: '이미 소셜 계정으로 전환된 계정이에요.',
  [ERROR_CODE.OAUTH_EMAIL_MISMATCH]: '계정 이메일과 같은 구글 계정만 연결할 수 있어요.',
  [ERROR_CODE.OAUTH_PROVIDER_UNSUPPORTED]: '지원하지 않는 소셜 로그인이에요.',
  [ERROR_CODE.OAUTH_FAILED]: '구글 인증에 실패했어요. 다시 시도해주세요.',
}

function toMessage(error: unknown): string {
  const code = getErrorCode(error)
  return (code && OAUTH_MESSAGE[code]) ?? getErrorMessage(error)
}

/**
 * 구글이 돌려보낸 인가 코드를 처리하는 화면.
 *
 * 사용자에게 보이는 시간은 아주 짧다. 로그인 화면과 마이페이지가 같은 동의 화면을 쓰므로
 * 출발할 때 기록한 의도(`login` · `link`)를 보고 갈라진다.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showToast = useUiStore((s) => s.showToast)

  const { mutate: exchange } = useOAuthLogin()
  const { mutate: link } = useSocialLink()

  /*
   * 인가 코드는 **한 번만** 쓸 수 있다. StrictMode 가 effect 를 두 번 실행하면
   * 두 번째 교환이 반드시 실패하고, 그 실패가 화면에 뜬다.
   */
  const exchanged = useRef(false)

  useEffect(() => {
    if (exchanged.current) return
    exchanged.current = true

    const backToLogin = (message: string) => {
      navigate(ROUTES.LOGIN, { replace: true, state: { authError: message } })
    }

    // 사용자가 동의 화면에서 취소하면 code 대신 error 가 온다
    const cancelled = Boolean(searchParams.get('error'))
    const intent = consumeOAuthRequest(searchParams.get('state'))
    const code = searchParams.get('code')

    if (intent === 'link') {
      if (cancelled || !code) {
        showToast('구글 계정 연결을 취소했어요.', 'warning')
        navigate(ROUTES.MYPAGE, { replace: true })
        return
      }

      link(code, {
        onSuccess: () => {
          showToast('구글 계정이 연결되었어요.')
          navigate(ROUTES.MYPAGE, { replace: true })
        },
        onError: (error) => {
          showToast(toMessage(error), 'danger')
          navigate(ROUTES.MYPAGE, { replace: true })
        },
      })
      return
    }

    if (cancelled) {
      backToLogin('구글 로그인을 취소했어요.')
      return
    }

    // state 가 안 맞으면 intent 가 null 이다 — 내가 시작한 요청이 아니다
    if (intent === null) {
      backToLogin('잘못된 접근이에요. 로그인을 다시 시도해주세요.')
      return
    }

    if (!code) {
      backToLogin('인가 코드를 받지 못했어요. 다시 시도해주세요.')
      return
    }

    exchange(code, {
      onSuccess: ({ isNewUser }) => {
        navigate(isNewUser ? ROUTES.BUSINESS_VERIFY : ROUTES.DASHBOARD, { replace: true })
      },
      onError: (error) => backToLogin(toMessage(error)),
    })
  }, [exchange, link, navigate, searchParams, showToast])

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-body2 text-text-secondary">구글 계정을 확인하고 있어요…</p>
    </div>
  )
}
