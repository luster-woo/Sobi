import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import Toggle from '@/shared/ui/Toggle'
import Tag from '@/shared/ui/Tag'
import DefinitionList from '@/shared/ui/DefinitionList'
import { IconBank, IconChevronRight } from '@/shared/ui/Icon'
import WithdrawModal from './WithdrawModal'
import { mockBusiness, mockDepositAccounts, mockUser } from '@/mocks/user.mock'
import { formatDate } from '@/shared/lib/format'

/** 18. 마이페이지 (+ 18-2 회원 탈퇴 모달) */
export default function MyPage() {
  const navigate = useNavigate()
  const [notify, setNotify] = useState(mockUser.notifyNewNotice)
  const [withdraw, setWithdraw] = useState(false)
  const account = mockDepositAccounts.find((a) => a.isWithdraw)!

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="size-11 rounded-full bg-border" aria-hidden="true" />
            <div>
              <p className="typo-h4">{mockUser.name}</p>
              <p className="mt-0.5 typo-body2 text-text-muted">{mockUser.email} · 사업자 회원</p>
            </div>
          </div>
          <Button variant="outline" size="sm">계정 정보 수정</Button>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="typo-h4">사업자 정보</p>
            <Badge variant="solid">인증됨</Badge>
          </div>
          <DefinitionList
            labelWidth={110}
            items={[
              { label: '상호', value: mockBusiness.storeName },
              { label: '사업자등록번호', value: mockBusiness.regNo },
              { label: '대표자', value: mockBusiness.owner },
              { label: '업종', value: mockBusiness.industry },
              { label: '사업장', value: mockBusiness.address },
              { label: '개업일', value: formatDate(mockBusiness.openedAt).replace(/\. /g, '. ') },
            ]}
          />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="typo-h4">마이데이터 연동</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">지금 갱신</Button>
              <Badge variant="solid">연동 중</Badge>
            </div>
          </div>
          {[['금융 거래 정보 · 4개 기관', '2026. 9. 2 갱신'], ['신용 정보', '2026. 9. 2 갱신']].map(([k, v], i) => (
            <div key={k} className={['flex items-center justify-between py-2', i > 0 ? 'border-t border-border-subtle' : ''].join(' ')}>
              <span className="typo-body2">{k}</span>
              <span className="typo-caption text-text-muted">{v}</span>
            </div>
          ))}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="typo-h4">연동 계좌</p>
            <Link to="/mypage/accounts" className="inline-flex items-center gap-1 typo-caption text-text-muted hover:text-text">
              전체 보기 <IconChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['입출금 3', '2,170만 원'], ['대출 2', '5,520만 원'], ['연동 기관', '4곳']].map(([k, v]) => (
              <button key={k} type="button" onClick={() => navigate('/mypage/accounts')} className="rounded-md bg-surface-muted p-4 text-left hover:bg-background">
                <p className="typo-caption text-text-muted">{k}</p>
                <p className="font-heading text-[20px] font-semibold">{v}</p>
              </button>
            ))}
          </div>
          <p className="typo-caption text-text-muted">카드를 누르면 계좌별 잔액과 연동 상태를 볼 수 있어요</p>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="typo-h4">알림 설정</p>
            <p className="typo-body2 text-text-secondary">새 공고 알림</p>
          </div>
          <Toggle checked={notify} onChange={setNotify} label="새 공고 알림" />
        </Card>

        <Card className="space-y-2 border-border-strong">
          <p className="typo-h4">출금·실행 계좌</p>
          <p className="flex items-center gap-2 typo-body1">
            <IconBank size={16} className="text-text-muted" /> {account.bank} {account.masked}
          </p>
          <Tag>자동이체 등록됨</Tag>
          <p className="typo-caption text-text-muted">대출 실행금 입금과 자동상환에 사용돼요</p>
        </Card>

        <Card className="space-y-1 p-0">
          <p className="px-5 pt-5 pb-1 typo-h4">바로가기</p>
          {[
            ['신청 현황', '진행 중 1건', '/applications'],
            ['관심 목록', '4건', '/bookmarks'],
            ['상환 관리', '다음 상환 9. 15', '/repayments'],
          ].map(([k, v, to]) => (
            <Link key={k} to={to} className="flex items-center justify-between border-t border-border-subtle px-5 py-3 hover:bg-surface-muted">
              <span className="typo-body2">{k}</span>
              <span className="inline-flex items-center gap-1 typo-caption text-text-muted">
                {v} <IconChevronRight size={12} />
              </span>
            </Link>
          ))}
        </Card>

        <Card>
          <button type="button" onClick={() => setWithdraw(true)} className="typo-label-sm text-danger hover:underline">
            회원 탈퇴
          </button>
        </Card>
      </div>

      <WithdrawModal open={withdraw} onClose={() => setWithdraw(false)} onConfirm={() => navigate('/')} />
    </div>
  )
}
