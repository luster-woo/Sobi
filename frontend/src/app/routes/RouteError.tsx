import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'

/** 화면에 띄울 한 줄. 스택 트레이스는 절대 내보내지 않는다 */
function toMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? '주소를 찾을 수 없어요.'
      : '화면을 불러오는 중 문제가 생겼어요.'
  }
  return '화면을 그리는 중 문제가 생겼어요.'
}

/**
 * 라우트 렌더 중 던져진 에러를 받는다.
 *
 * 프로덕션에서도 콘솔에 남긴다. 사용자에게는 안 보이지만, QA 가 재현했을 때
 * 개발자 도구만 열면 원인을 집을 수 있어야 한다 — 이게 없으면 '에러 화면이 떴다'
 * 는 제보만 남고 무엇이 터졌는지 알 방법이 없다.
 */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()

  console.error('[route] 렌더 중 예외', error)

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col">
      <EmptyState
        title={toMessage(error)}
        description="잠시 후 다시 시도해 주세요. 계속 같은 화면이 보이면 문의해 주세요."
        action={
          <span className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
            <Button onClick={() => void navigate(ROUTES.DASHBOARD)}>대시보드로</Button>
          </span>
        }
      />
    </div>
  )
}
