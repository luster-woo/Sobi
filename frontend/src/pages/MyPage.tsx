import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'

import { buildAuthorizeUrl, isGoogleOAuthConfigured } from '@/features/auth/model/googleOAuth'
import LinkRow from '@/features/mypage/components/LinkRow'
import PanelHead from '@/features/mypage/components/PanelHead'
import PasswordChangeModal from '@/features/mypage/components/PasswordChangeModal'
import SocialLinkModal from '@/features/mypage/components/SocialLinkModal'
import WithdrawModal from '@/features/mypage/components/WithdrawModal'
import { MOCK_MYPAGE, MOCK_MYPAGE_PRE_OWNER } from '@/features/mypage/model/mock'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { AUTH_PROVIDER, USER_ROLE } from '@/shared/types'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Panel from '@/shared/ui/Panel'
import Switch from '@/shared/ui/Switch'
import { formatMoneyShort } from '@/shared/utils/formatters'

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
 * 제일 긴 라벨에 맞춘 값이다.
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
 * 알림, 출금 계좌, 바로가기, 탈퇴. 읽는 것과 누르는 것을 나눠 둔다.
 *
 * 탈퇴를 맨 아래 오른쪽에 두는 이유: 되돌릴 수 없는 동작이라 눈에 먼저 들어오면 안
 * 되지만, 찾을 수 없을 만큼 숨기면 그것대로 불친절하다.
 *
 * ⚠️ 값은 전부 목이다(features/mypage/model/mock.ts). `GET /user/me` 가 붙으면
 *    여기서 useQuery 로 바꾸고 로딩·에러를 넣는다.
 */
export function MyPage() {
  /*
   * role 로 목을 고른다. 목의 business 만 보고 갈랐더니 예비창업자로 로그인해도
   * 사업자 화면이 떴다 — 목이 하나뿐이었기 때문이다.
   *
   * ⚠️ `GET /user/me` 가 붙으면 이 분기가 사라진다. 서버가 role 에 맞는 응답을
   *    주고 화면은 business 가 null 인지만 보면 된다.
   */
  const role = useAuthStore((s) => s.user?.role)
  const data = role === USER_ROLE.PREENTREPRENEUR ? MOCK_MYPAGE_PRE_OWNER : MOCK_MYPAGE
  const { profile, business, myData, accountSummary, shortcut } = data

  /*
   * 가입 경로는 스토어를 먼저 본다. 소셜 전환에 성공하면 `useSocialLink` 가 여기에
   * 넣어주므로 돌아오자마자 화면이 '연결됨' 으로 바뀐다.
   *
   * ⚠️ 새로고침하면 스토어가 비어 목 값(LOCAL)으로 되돌아간다. 로그인 응답에 가입
   *    경로가 없어서 복구할 방법이 없다 — `GET /user/me` 가 붙으면 해결된다 (BE-02).
   */
  const linkedProvider = useAuthStore((s) => s.provider)
  const provider = linkedProvider ?? profile.provider

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [socialLinkOpen, setSocialLinkOpen] = useState(false)
  // ⚠️ PATCH /user/notification 이 붙기 전까지 화면 안에서만 기억한다
  const [notification, setNotification] = useState(data.notification)

  return (
    <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <Panel className="flex flex-wrap items-center justify-between gap-3 px-[15px] py-3.5">
          <span className="min-w-0">
            <b className="text-text text-body1 block font-semibold">{profile.name}</b>
            <span className="text-text-muted text-caption block truncate">
              {profile.email} · {business ? '사업자' : '예비 창업자'} 회원
            </span>
          </span>

          {/*
           * 로컬 가입은 비밀번호를 바꿀 수 있고 구글로 전환할 수 있다.
           * 소셜 가입은 둘 다 해당 없다 — 비밀번호가 없고 이미 전환된 상태다.
           */}
          {provider === AUTH_PROVIDER.LOCAL ? (
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
        {business ? (
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
              {/* 여섯 줄을 세로로 쌓으면 왼쪽 열만 길어진다. 값이 짧아 2열이 낫다 */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-[15px] py-3">
                <Field term="상호" description={business.businessName} />
                <Field term="사업자등록번호" description={business.brn} />
                <Field term="대표자" description={business.ownerName} />
                <Field term="업종" description={business.industryName} />
                <Field term="사업장" description={business.region} />
                <Field term="개업일" description={business.openDate.replaceAll('-', '. ')} />
              </dl>
            </Panel>

            <Panel>
              <PanelHead
                title="마이데이터 연동"
                aside={
                  <span className="flex items-center gap-2">
                    <Badge variant={myData.linked ? 'success' : 'outline'}>
                      {myData.linked ? '연동 중' : '연동 전'}
                    </Badge>
                    {/* TODO: POST /mydata/refresh — 비동기라 진행률 화면이 필요하다 */}
                    <Button variant="outline" size="sm">
                      지금 갱신
                    </Button>
                  </span>
                }
              />
              {myData.links.map((link) => (
                <LinkRow
                  key={link.label}
                  label={link.label}
                  value={toUpdatedLabel(link.updatedAt)}
                />
              ))}
            </Panel>
          </>
        ) : (
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
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        <Panel className="flex flex-col gap-2.5 px-[15px] py-3">
          <h3 className="text-text text-body2 font-bold">알림 설정</h3>
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-text text-body2">새 공고 알림</span>
            <Switch label="새 공고 알림" checked={notification} onChange={setNotification} />
          </div>
        </Panel>

        {/*
         * 출금·실행 계좌와 바로가기 패널을 뺐다.
         * 출금 계좌는 연동 계좌 화면에서 '출금 계좌' 배지로 이미 보이고, 바로가기는
         * 신청 현황·관심 목록·상환 관리가 전부 사이드바에 있어 같은 링크를 두 벌 두는 셈이었다.
         */}
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
        email={profile.email}
        onConfirm={() => {
          window.location.assign(buildAuthorizeUrl('link'))
        }}
      />

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        applicationInProgress={shortcut.applicationInProgress}
        repayingLoans={2}
        favoriteCount={shortcut.favoriteCount}
      />
    </div>
  )
}
