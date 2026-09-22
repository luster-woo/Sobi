import { useState } from 'react'
import { useNavigate } from 'react-router'

import TermsAgreementList from '@/features/auth/components/TermsAgreementList'
import { REQUIRED_TERM_IDS } from '@/features/auth/model/terms'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'

/**
 * 서버로 보내는 것이 없다. 약관 API 가 없고 `/auth/signup` 도 동의 여부를 받지 않아서
 * 프론트 게이트 역할만 한다 — 필수 항목을 체크해야 회원가입으로 넘어간다.
 */
export function TermsPage() {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState<string[]>([])

  const canProceed = REQUIRED_TERM_IDS.every((id) => agreed.includes(id))

  return (
    <>
      <div className="mb-6.5 text-center">
        <h1 className="text-h2 tracking-[-0.02em]">서비스 이용을 위해 동의가 필요해요</h1>
        <p className="text-body2 text-text-secondary mt-2.5">
          필수 항목에 모두 동의하면 다음으로 넘어갈 수 있어요.
        </p>
      </div>

      <TermsAgreementList agreed={agreed} onChange={setAgreed} />

      {/* 동의 값은 여기서 끝난다. signup body 에 실어야 하면 이 state 를 넘기면 된다 */}
      <Button
        size="lg"
        disabled={!canProceed}
        onClick={() => navigate(ROUTES.SIGN_UP)}
        className="mt-5 w-full max-w-[560px]"
      >
        다음
      </Button>
    </>
  )
}
