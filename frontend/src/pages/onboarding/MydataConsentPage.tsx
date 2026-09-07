import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingShell from './OnboardingShell'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import Tag from '@/shared/ui/Tag'
import DefinitionList from '@/shared/ui/DefinitionList'
import { IconCheckCircle } from '@/shared/ui/Icon'

const ITEMS: [string, string][] = [
  ['매출 정보', '최근 24개월 카드·현금 매출'],
  ['현금 흐름', '월별 입금·출금 기준 현금 흐름'],
  ['기존 대출 잔액', '잔액·금리·상환 일정'],
  ['입출금 내역', '최근 24개월 계좌 거래 내역'],
  ['신용 정보', '신용등급·연체 이력'],
  ['보험 가입 내역', '의무보험 가입 여부 진단용'],
]

/** 08. 마이데이터 전송요구 동의 */
export default function MydataConsentPage() {
  const navigate = useNavigate()
  const [agree, setAgree] = useState(true)

  return (
    <OnboardingShell
      title="마이 데이터를 연동하면 가능한 상품만 보여드려요"
      description={
        <>
          연동하면 매출·대출 잔액을 바탕으로 받을 수 있는 자금을 자동으로 찾아드려요.
          <br />
          동의하지 않으면 대시보드의 자금 진단 기능을 이용할 수 없어요.
        </>
      }
    >
      <Card className="space-y-1 p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="typo-h4">전송을 요구하는 정보</span>
          <Tag>신용정보법 고지</Tag>
        </div>
        {ITEMS.map(([k, v], i) => (
          <div
            key={k}
            className={['flex items-center justify-between py-3', i > 0 ? 'border-t border-border-subtle' : ''].join(' ')}
          >
            <span className="flex items-center gap-3">
              <IconCheckCircle size={18} className="text-primary" />
              <span className="typo-body1">{k}</span>
            </span>
            <span className="typo-caption text-text-muted">{v}</span>
          </div>
        ))}
      </Card>

      <Card className="space-y-4 p-6">
        <span className="typo-h4">이용 목적 및 보유 기간</span>
        <DefinitionList
          items={[
            { label: '이용 목적', value: '대출·정부지원금 자격 판정 및 자금 조합 추천' },
            { label: '보유 기간', value: '연동일로부터 1년 (동의 철회 시 즉시 파기)' },
            { label: '제공 기관', value: '금융결제원 마이데이터 중계 (참여 기관 12곳)' },
          ]}
        />
      </Card>

      <div className="flex items-center justify-between px-1">
        <Checkbox
          label={<span className="typo-label-sm">[필수] 전송요구 내용을 확인했으며, 위 항목의 전송에 동의합니다.</span>}
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <button type="button" className="typo-caption text-text-muted hover:text-text">
          전문 보기
        </button>
      </div>

      <Button className="w-full" disabled={!agree} onClick={() => navigate('/mydata/loading')}>
        연동하기
      </Button>
    </OnboardingShell>
  )
}
