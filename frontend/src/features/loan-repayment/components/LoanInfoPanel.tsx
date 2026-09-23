import type { ReactNode } from 'react'

import { formatDotDate, formatWonText, maskAccountNo } from '@/features/loan-repayment/model/format'
import type { LoanProduct } from '@/features/loan-repayment/model/types'
import Panel from '@/shared/ui/Panel'

interface LoanInfoPanelProps {
  product: LoanProduct
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-muted text-caption shrink-0">{label}</dt>
      <dd className="text-text text-caption truncate tabular-nums">{children}</dd>
    </div>
  )
}

/**
 * 대출 정보.
 *
 * 시안에 없던 패널이다. 금리 인하 요구 카드가 빠지면서 우측 열에 진행률 하나만 남아
 * 화면이 한쪽으로 기울었고, 자동 이체 카드도 빠지면서 출금 계좌를 보여줄 자리가
 * 사라졌다. list 응답에서 아무데도 안 쓰던 값들(원금·실행일·만기일·총 회차)을 모아
 * 그 두 문제를 같이 해결한다.
 *
 * 계좌번호는 뒷자리만 보여준다. 전체를 띄울 이유가 없고, 본인 화면이라도 화면 공유나
 * 어깨너머로 새어 나간다.
 */
export default function LoanInfoPanel({ product }: LoanInfoPanelProps) {
  return (
    <Panel title="대출 정보">
      <dl className="px-card flex flex-col gap-2.5 py-3.5">
        <Row label="대출 원금">{formatWonText(product.loanBalance)}</Row>
        <Row label="실행일">{formatDotDate(product.loanDate)}</Row>
        <Row label="만기일">{formatDotDate(product.maturityDate)}</Row>
        <Row label="총 회차">{product.loanPeriod.toLocaleString('ko-KR')}회</Row>
        <Row label="출금 계좌">
          {product.bankName} {maskAccountNo(product.withdrawalAccountNo)}
        </Row>
      </dl>
    </Panel>
  )
}
