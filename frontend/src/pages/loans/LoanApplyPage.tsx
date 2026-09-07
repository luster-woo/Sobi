import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import DefinitionList from '@/components/common/DefinitionList'
import DocumentList from '@/components/common/DocumentList'
import { IconCheckCircle, IconChevronRight } from '@/components/common/Icon'
import Select from '@/components/common/Select'
import Tag from '@/components/common/Tag'
import { mockLoanSubmitDocs, mockLoanWriteDocs } from '@/mocks/applications.mock'
import { mockLoans } from '@/mocks/loans.mock'
import { mockDepositAccounts } from '@/mocks/user.mock'
import { formatManWon, formatMonthDay } from '@/utils/format'

/** 13-2. 대출 신청·서류 제출 */
export default function LoanApplyPage() {
  const navigate = useNavigate()
  const { loanId } = useParams()
  const loan = mockLoans.find((l) => l.id === loanId) ?? mockLoans[0]
  const [docs, setDocs] = useState(mockLoanSubmitDocs)
  const withdraw = mockDepositAccounts.find((a) => a.isWithdraw)!

  const upload = (id: string) =>
    setDocs((xs) => xs.map((d) => (d.id === id ? { ...d, status: 'passed' } : d)))
  const ready = docs.every((d) => d.status === 'passed' || d.status === 'checking')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="typo-h2">{loan.name}</h2>
        <div className="mt-2 flex gap-2">
          <Tag>연 {loan.rate}%</Tag>
          <Tag>최대 {formatManWon(loan.limitAmount)} 무담보</Tag>
          {loan.deadline && <Tag>~{formatMonthDay(loan.deadline)}</Tag>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <DocumentList submit={docs} write={mockLoanWriteDocs} onUpload={upload} />

          <section className="space-y-3">
            <h3 className="typo-h4">출금 계좌</h3>
            <Card className="space-y-3">
              <Select
                label="계좌번호"
                options={mockDepositAccounts.map(
                  (a) => `${a.bank}  ${a.masked.replace('****', '508-12')}`,
                )}
              />
              <div className="flex items-center gap-2">
                <IconCheckCircle size={18} className="text-primary" />
                <span className="typo-body2">예금주 김사장·계좌 확인 완료</span>
              </div>
              <p className="typo-caption text-text-muted">
                입력한 출금 계좌는 대출 실행금 입금과 자동이체(자동상환) 계좌로 등록돼요.
              </p>
            </Card>
          </section>

          <Button
            size="lg"
            className="w-full"
            disabled={!ready}
            onClick={() => navigate(`/loans/${loan.id}/status`)}
          >
            신청하기
          </Button>
          {!ready && (
            <p className="typo-caption text-text-disabled text-center">
              목업 안내: 검증 실패·미제출 서류의 업로드 버튼을 누르면 통과 처리돼요
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="typo-h4">제출·작성 서류</p>
            <ol className="space-y-2.5">
              {[
                ...docs.map((d) => [d.name, d.source]),
                ...mockLoanWriteDocs.map((w) => [w.name, '화면에서 작성']),
              ].map(([n, s], i) => (
                <li key={n} className="flex items-center justify-between gap-2">
                  <span className="typo-body2 flex items-center gap-2">
                    <span className="border-border-strong typo-caption text-text-muted inline-flex size-5 items-center justify-center rounded-full border">
                      {i + 1}
                    </span>
                    {n}
                  </span>
                  <span className="typo-caption text-text-muted">{s}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="space-y-3">
            <p className="typo-h4">업로드 제한</p>
            <DefinitionList
              size="sm"
              labelWidth={48}
              items={[
                { label: '형식', value: 'PDF - JPG - PNG' },
                { label: '용량', value: '파일당 10MB 이하' },
                { label: '장수', value: '서류당 최대 5장' },
              ]}
            />
          </Card>

          <Card className="relative space-y-1">
            <p className="typo-caption text-text-muted">승인되면 출금 계좌로</p>
            <p className="typo-h4">
              {withdraw.bank} {withdraw.masked}
            </p>
            <p className="typo-caption text-text-muted">
              신청 화면 입력한 출금 계좌예요.
              <br />
              실행금 입금과 자동상환에 사용돼요.
            </p>
            <IconChevronRight size={16} className="text-text-muted absolute right-4 bottom-4" />
          </Card>
        </div>
      </div>
    </div>
  )
}
