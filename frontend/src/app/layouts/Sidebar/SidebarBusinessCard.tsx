import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useBusinessSummary } from '@/features/business/hooks/useBusinessSummary'
import { getErrorStatus } from '@/shared/api/errors'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { isPreOwner } from '@/shared/types'
import Skeleton from '@/shared/ui/Skeleton'

/** 사이드바 하단 여백. 카드가 안 그려지는 경우까지 포함해 이 컴포넌트가 들고 있다 */
function Frame({ children }: { children: ReactNode }) {
  return <div className="shrink-0 p-3">{children}</div>
}

/**
 * 사이드바 맨 아래 업체 정보.
 *
 * 지금 어느 업체 기준으로 화면을 보고 있는지 알려주는 자리다. 추천·보험·세액이 전부
 * 업체 하나에 묶여 있어서, 이게 없으면 화면의 숫자가 무엇에 대한 값인지 알 수 없다.
 *
 * 예비 창업자(PRE_OWNER)에게는 여백까지 포함해 아무것도 그리지 않는다.
 * `business_info` 가 없어서 채울 값이 없고, 빈 카드나 '창업 준비 중' 같은 문구를
 * 남겨두면 자리만 차지한 채 아무 정보도 주지 못한다.
 */
export function SidebarBusinessCard() {
  const role = useAuthStore((s) => s.user?.role)
  const { data, isPending, isError, error } = useBusinessSummary()

  if (isPreOwner(role ?? null)) return null

  if (isPending) {
    return (
      <Frame>
        <div
          role="status"
          aria-label="업체 정보를 불러오는 중"
          className="bg-surface-muted space-y-1.5 rounded-md px-3 py-2.5"
        >
          <Skeleton variant="text" width="55%" height={13} />
          <Skeleton variant="text" width="80%" height={11} />
        </div>
      </Frame>
    )
  }

  /*
   * ⚠️ **404 만 '미등록'이다.** 예전에는 `isError` 를 전부 미등록으로 그렸는데, 그러면
   *    401·500·네트워크 끊김에도 '업체 등록하기' 가 떠서 **이미 등록한 사업자를 등록
   *    화면으로 보낸다.** 거기서 같은 사업자번호를 다시 넣으면 unique 제약에 걸려 500 이
   *    나고, 백엔드에 user 당 1건 제약이 없어 다른 번호로는 행이 둘 생긴다 —
   *    그러면 `findByUserId` 가 단건을 못 골라 `/business/me` 와 `/insurance` 가
   *    영구 500 이 된다. 잘못된 안내 하나가 계정을 못 쓰게 만드는 경로다.
   *
   *    미등록 응답은 404 BUSINESS_O04 뿐이다(`BusinessServiceImpl`).
   */
  if (isError && getErrorStatus(error) === 404) {
    return (
      <Frame>
        {/* 업체 등록은 사업자 인증 화면에서 한다. /onboarding 은 라우트가 없어 404 였다 */}
        <Link
          to={ROUTES.BUSINESS_VERIFY}
          className="bg-surface-muted hover:bg-primary-soft border-border-subtle hover:border-primary/30 block rounded-md border border-dashed px-3 py-2.5 transition-colors"
        >
          <span className="text-body2 text-text block font-semibold">업체 등록하기</span>
          <span className="text-caption text-text-muted block">맞춤 추천을 받으려면 필요해요</span>
        </Link>
      </Frame>
    )
  }

  /*
   * 그 밖의 실패는 아무것도 그리지 않는다. 사이드바 한 칸이라 오류를 설명할 자리가
   * 없고, 잘못 안내하느니 비워 두는 편이 낫다 — 진짜 문제는 본문 화면이 알린다.
   */
  if (isError || !data) return null

  const { name, region, industryName } = data

  return (
    <Frame>
      <div className="bg-surface-muted rounded-md px-3 py-2.5">
        {/* title 을 다는 이유: 224px 안에서 잘리면 전체 문구를 볼 방법이 없다 */}
        <p className="text-body2 text-text truncate font-semibold" title={name}>
          {name}
        </p>
        <p className="text-caption text-text-muted truncate" title={`${region}·${industryName}`}>
          {region}·{industryName}
        </p>
      </div>
    </Frame>
  )
}
