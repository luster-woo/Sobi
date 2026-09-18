import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useApplications } from '@/features/application/hooks/useApplication'
import { buildAuthorizeUrl, isGoogleOAuthConfigured } from '@/features/auth/model/googleOAuth'
import { useLoanProducts } from '@/features/loan-repayment/hooks/useRepayment'
import { useMydataRefresh } from '@/features/mydata/hooks/useMydata'
import LinkRow from '@/features/mypage/components/LinkRow'
import PanelHead from '@/features/mypage/components/PanelHead'
import PasswordChangeModal from '@/features/mypage/components/PasswordChangeModal'
import SocialLinkModal from '@/features/mypage/components/SocialLinkModal'
import WithdrawModal from '@/features/mypage/components/WithdrawModal'
import { useBookmarks } from '@/features/mypage/hooks/useBookmarks'
import { useMyPage, useToggleNotification } from '@/features/mypage/hooks/useMyPage'
import { ROUTES } from '@/shared/constants/routes'
import { AUTH_PROVIDER, isPreOwner } from '@/shared/types'
import { APPLICATION_STATUS } from '@/shared/types/application'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import Switch from '@/shared/ui/Switch'
import { formatMoneyShort } from '@/shared/utils/formatters'
import { maskBizNo } from '@/shared/utils/mask'

/** '2026-09-11T14:20:00' → '2026. 9. 11 갱신' */
function toUpdatedLabel(iso: string | null) {
  if (!iso) return '연동 전'
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return `${iso.slice(0, 4)}. ${month}. ${day} 갱신`
}

/**
 * 패널 머리의 작은 이동 링크.
 *
 * Button 은 `<button>` 만 그려서 to 를 못 받는다. 화면 이동이므로 링크여야
 * 새 탭·가운데 클릭이 된다.
 */
function SmallLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="border-border-strong bg-surface text-text hover:bg-surface-muted font-heading text-body2 inline-flex h-[30px] shrink-0 items-center rounded-sm border px-3 font-medium transition-colors"
    >
      {children}
    </Link>
  )
}

/**
 * 항목 한 줄.
 *
 * 라벨 폭을 고정한다. '상호'(두 글자)와 '사업자등록번호'(일곱 글자)가 섞여 있어서,
 * 폭을 내용에 맡기면 값이 줄마다 다른 자리에서 시작해 세로로 훑을 수가 없다.
 */
function Field({ term, description }: { term: string; description: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-text-muted text-caption w-[88px] shrink-0">{term}</dt>
      <dd className="text-text text-body2 min-w-0 flex-1 tabular-nums">{description}</dd>
    </div>
  )
}

/**
 * 마이페이지 (S15P21D101-18) — 시안 18.
 *
 * 왼쪽은 '내 정보' 다 — 계정·사업자·마이데이터·계좌. 오른쪽은 '설정과 이동' 이다 —
 * 알림, 탈퇴. 읽는 것과 누르는 것을 나눠 둔다.
 *
 * 탈퇴를 맨 아래 오른쪽에 두는 이유: 되돌릴 수 없는 동작이라 눈에 먼저 들어오면 안
 * 되지만, 찾을 수 없을 만큼 숨기면 그것대로 불친절하다.
 */
export function MyPage() {
  const { data, isLoading, isError } = useMyPage()
  const toggle = useToggleNotification()
  const refresh = useMydataRefresh()

  /*
   * 탈퇴 전에 보여줄 숫자들. 마이페이지 응답에 없어서 각자 제 API 에서 가져온다.
   * 탈퇴 모달을 열어야 필요한 값이지만, 모달 안에서 조회하면 열자마자 빈 숫자가
   * 잠깐 보인다 — 어차피 가벼운 조회라 화면에서 미리 받아둔다.
   */
  const { data: favorites } = useBookmarks()
  const { data: applications } = useApplications()
  const { data: loans } = useLoanProducts({ enabled: !isPreOwner(data?.profile.role ?? null) })

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [socialLinkOpen, setSocialLinkOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <Skeleton className="h-[72px] w-full" />
          <Skeleton className="h-[92px] w-full" />
          <Skeleton className="h-[160px] w-full" />
        </div>
        <Skeleton className="h-[110px] w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="내 정보를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        }
      />
    )
  }

  const { profile, business, myData, accountSummary, notification } = data

  /*
   * 회원 유형은 **role 로 가른다.** `business` 가 있는지로 가르면 안 된다 —
   * 사업자인데 응답의 businessInfo 가 비어 오는 경우(백엔드 오류, 조회 실패)에
   * 화면이 '예비 창업자' 로 바뀌고 '사업자 인증하기' 버튼을 띄운다. 이미 등록한
   * 사람을 등록 화면으로 보내는 셈인데, 거기서 같은 사업자번호를 다시 넣으면
   * unique 제약에 걸려 500 이 나고 다른 번호로는 행이 둘 생긴다. 그러면
   * `findByUserId` 가 단건을 못 골라 `/business/me` 와 `/insurance` 가 영구 500 이 된다
   * (`SidebarBusinessCard` 주석에 같은 사고가 적혀 있다).
   *
   * 그래서 '누구인가' 는 role 이, '무엇을 그릴 수 있나' 는 business 가 정한다.
   */
  const preOwner = isPreOwner(profile.role)

  const inProgressCount = (applications ?? []).filter(
    (application) => application.status !== APPLICATION_STATUS.PAID,
  ).length

  return (
    <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <Panel className="flex flex-wrap items-center justify-between gap-3 px-[15px] py-3.5">
          <span className="min-w-0">
            <b className="text-text text-body1 block font-semibold">{profile.name}</b>
            <span className="text-text-muted text-caption block truncate">
              {profile.email} · {preOwner ? '예비 창업자' : '사업자'} 회원
            </span>
          </span>

          {/*
           * 로컬 가입은 비밀번호를 바꿀 수 있고 구글로 전환할 수 있다.
           * 소셜 가입은 둘 다 해당 없다 — 비밀번호가 없고 이미 전환된 상태다.
           */}
          {profile.provider === AUTH_PROVIDER.LOCAL ? (
            <span className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                비밀번호 수정
              </Button>

              {/* 되돌릴 수 없어서 모달로 한 번 확인받는다 */}
              <Button
                variant="outline"
                size="sm"
                disabled={!isGoogleOAuthConfigured()}
                onClick={() => setSocialLinkOpen(true)}
              >
                Google 계정 연결
              </Button>
            </span>
          ) : (
            <Badge variant="success">Google 연결됨</Badge>
          )}
        </Panel>

        {/*
         * 예비창업자는 여기부터 아래가 전부 없다. 사업자등록이 없으면 마이데이터를
         * 연동할 수 없고, 연동이 없으면 계좌도 없다. 빈 패널을 '연동 전' 으로
         * 남겨두면 할 수 있는데 안 한 것처럼 보인다 — 할 수 없는 것이다.
         */}
        {preOwner ? (
          <Panel>
            <PanelHead title="사업자 정보" aside={<Badge variant="outline">미인증</Badge>} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-[15px] py-3.5">
              <p className="text-text-secondary text-body2 leading-[1.7]">
                사업자 인증을 하면 매출·신용 기준으로 자격을 판정하고
                <br />
                마이데이터 연동과 계좌 관리를 쓸 수 있어요.
              </p>
              <SmallLink to={ROUTES.BUSINESS_VERIFY}>사업자 인증하기</SmallLink>
            </div>
          </Panel>
        ) : (
          <>
            {accountSummary && (
              <Panel>
                <PanelHead
                  title="연동 계좌"
                  aside={<SmallLink to={ROUTES.MYPAGE_ACCOUNTS}>전체 보기</SmallLink>}
                />
                <dl className="divide-border-subtle grid grid-cols-3 divide-x">
                  <div className="px-3.5 py-3">
                    <dt className="text-text-muted text-[11px]">입출금 잔액</dt>
                    <dd className="text-text mt-0.5 text-[17px] font-bold tracking-tight tabular-nums">
                      {formatMoneyShort(accountSummary.totalBalance)}
                    </dd>
                  </div>
                  <div className="px-3.5 py-3">
                    <dt className="text-text-muted text-[11px]">대출 잔액</dt>
                    <dd className="text-text mt-0.5 text-[17px] font-bold tracking-tight tabular-nums">
                      {formatMoneyShort(accountSummary.totalLoanBalance)}
                    </dd>
                  </div>
                  <div className="px-3.5 py-3">
                    <dt className="text-text-muted text-[11px]">연결 계좌</dt>
                    <dd className="text-text mt-0.5 text-[17px] font-bold tracking-tight tabular-nums">
                      {accountSummary.accountCount}
                      <span className="text-text-secondary text-[11.5px] font-normal">개</span>
                    </dd>
                  </div>
                </dl>
              </Panel>
            )}

            <Panel>
              <PanelHead title="사업자 정보" aside={<Badge variant="success">인증됨</Badge>} />

              {/*
               * ⚠️ 사업자인데 내용이 비어 올 수 있다. 그때도 '미인증' 으로 그리지 않는다 —
               * 등록 화면으로 보내면 같은 번호로 중복 등록을 시도하게 되고, 그게
               * `/business/me` 를 영구 500 으로 만드는 경로다. 못 불러왔다고만 알린다.
               */}
              {business ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-[15px] py-3">
                  <Field term="상호" description={business.businessName} />
                  {/*
                   * 등록번호를 가린다. 상호·대표자·개업일이 한 화면에 같이 떠 있어서,
                   * 전체를 보여주면 국세청 진위확인을 그대로 통과하는 조합이 된다
                   * (`/business/verify` 가 셋을 받는다).
                   */}
                  <Field term="사업자등록번호" description={maskBizNo(business.brn)} />
                  <Field term="대표자" description={business.ownerName} />
                  <Field term="업종" description={business.industryName} />
                  <Field term="사업장" description={business.address} />
                  <Field term="개업일" description={business.openDate.replaceAll('-', '. ')} />
                </dl>
              ) : (
                <p className="text-text-muted text-body2 px-[15px] py-3.5">
                  업체 정보를 불러오지 못했어요. 잠시 후 새로고침해 주세요.
                </p>
              )}
            </Panel>

            <Panel>
              <PanelHead
                title="마이데이터 연동"
                aside={
                  <span className="flex items-center gap-2">
                    <Badge variant={myData ? 'success' : 'outline'}>
                      {myData ? '연동 중' : '연동 전'}
                    </Badge>

                    {/* 서버 쿨다운이 남아 있으면 눌러도 429 라 미리 잠근다 */}
                    {refresh.remaining && (
                      <span className="text-text-muted text-[11.5px]">
                        {refresh.remaining} 갱신 가능
                      </span>
                    )}

                    {/* 응답까지 수십 초 걸린다. 화면을 옮기지 않고 버튼에서 기다린다 */}
                    <Button
                      variant="outline"
                      size="sm"
                      loading={refresh.isPending}
                      disabled={refresh.remaining !== null}
                      onClick={refresh.refresh}
                    >
                      지금 갱신
                    </Button>
                  </span>
                }
              />

              {/*
               * 항목별 갱신 시각은 서버가 주지 않는다. 응답에 있는 건 마지막 판정 시각
               * 하나뿐이라 두 줄이 같은 값을 쓴다 — 항목마다 다른 시각을 보여주려면
               * 백엔드가 수집원별 시각을 나눠 줘야 한다.
               */}
              <LinkRow label="금융 거래 정보" value={toUpdatedLabel(myData?.linkedAt ?? null)} />
              <LinkRow label="신용 정보" value={toUpdatedLabel(myData?.linkedAt ?? null)} />
            </Panel>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <Panel className="flex flex-col gap-2.5 px-[15px] py-3">
          <h3 className="text-text text-body2 font-bold">알림 설정</h3>
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-text text-body2">새 공고 알림</span>
            {/*
             * 서버가 현재 값을 뒤집는 방식이라 연타를 막아야 한다. 두 번 보내면
             * 원래대로 돌아온다.
             */}
            <Switch
              label="새 공고 알림"
              checked={notification}
              disabled={toggle.isPending}
              onChange={() => toggle.mutate()}
            />
          </div>
        </Panel>

        <Panel className="px-[15px] py-2.5">
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="text-danger text-body2 hover:text-danger-hover rounded-sm transition-colors"
          >
            회원 탈퇴
          </button>
        </Panel>
      </div>

      <PasswordChangeModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      <SocialLinkModal
        open={socialLinkOpen}
        onClose={() => setSocialLinkOpen(false)}
        /*
         * ⚠️ 백엔드 `AuthServiceImpl.linkSocial` 이 계정 이메일과 구글 이메일이 같은지
         *    보고 다르면 AUTH_016 을 던진다. 안내에 쓰는 주소가 실제 계정 주소여야
         *    사용자가 엉뚱한 계정으로 맞추려다 계속 실패하지 않는다.
         */
        email={profile.email}
        onConfirm={() => {
          window.location.assign(buildAuthorizeUrl('link'))
        }}
      />

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        applicationInProgress={inProgressCount}
        repayingLoans={loans?.length ?? 0}
        favoriteCount={favorites?.length ?? 0}
      />
    </div>
  )
}
