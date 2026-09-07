import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import DefinitionList from '@/components/common/DefinitionList'
import { IconCheckCircle } from '@/components/common/Icon'
import StatCard from '@/components/common/StatCard'
import Stepper from '@/components/common/Stepper'
import { mockLoans } from '@/mocks/loans.mock'
import { mockContracts } from '@/mocks/repayments.mock'
import { formatDate, formatWon } from '@/utils/format'

/** 13-3. 대출 진행 현황 (실행 완료) */
export default function LoanStatusPage() {
  const navigate = useNavigate()
  const { loanId } = useParams()
  const loan = mockLoans.find((l) => l.id === loanId) ?? mockLoans[0]
  const ct = mockContracts[0]

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IconCheckCircle size={26} className="text-primary" />
            <div>
              <p className="typo-h4">대출금이 입금되었어요</p>
              <p className="typo-caption text-text-muted">
                {loan.name}·실행일 {formatDate(ct.executedAt)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-[26px] font-semibold">{formatWon(ct.principal)}</p>
            <p className="typo-caption text-text-muted">실행 금액</p>
          </div>
        </Card>

        <Card className="space-y-6">
          <p className="typo-h4">실행 진행 상태</p>
          <Stepper
            className="px-10"
            steps={[
              { label: '승인', sub: '8.29', done: true },
              { label: '약정 체결', sub: '9.1', done: true },
              { label: '계좌 입금', sub: '9. 2', done: false },
            ]}
          />
        </Card>

        <Card className="space-y-4">
          <p className="typo-h4">입금 내역</p>
          <DefinitionList
            labelWidth={96}
            items={[
              {
                label: '입금 계좌',
                value: `${ct.account.bank} ${ct.account.masked} (신청 시 입력한 출금 계좌)`,
              },
              { label: '입금 일시', value: `${formatDate(ct.executedAt)} 14:20` },
              {
                label: '실행 금액',
                value: <span className="typo-h4 font-semibold">{formatWon(ct.principal)}</span>,
              },
              { label: '취급 기관', value: ct.agency },
              { label: '계약 번호', value: ct.contractNo },
            ]}
          />
        </Card>

        <section className="space-y-3">
          <p className="typo-h4">상환 조건 요약</p>
          <div className="grid grid-cols-4 gap-4">
            <StatCard value={formatDate(ct.firstDueDate)} label="첫 상환일 (거치 이자 8.5만 원)" />
            <StatCard value="88만 원" label="거치 후 월 상환액" />
            <StatCard value={`연 ${ct.rate}%`} label="적용 금리" />
            <StatCard value={formatDate(ct.maturity)} label="만기" />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <Card className="space-y-4">
          <p className="typo-h4">자동상환 안내</p>
          <p className="typo-body2 text-text-secondary">
            신청 시 입력한 출금 계좌({ct.account.bank} {ct.account.masked})가 자동이체 계좌로
            등록됐어요, 매월 {ct.account.day}일에 수시 입출금 계좌에서 자동상환돼요.
          </p>
          <Button className="w-full" onClick={() => navigate('/repayments')}>
            상환 관리로 이동
          </Button>
        </Card>
        <Card className="space-y-4">
          <p className="typo-h4">입금 계좌를 못 받으셨나요?</p>
          <p className="typo-body2 text-text-secondary">
            약정 계좌가 정지 상태면 입금이 보류돼요, 계좌 확인 후 재입금을 요청할 수 있어요.
          </p>
          <Button variant="outline" className="w-full">
            재입금 요청
          </Button>
        </Card>
      </div>
    </div>
  )
}
