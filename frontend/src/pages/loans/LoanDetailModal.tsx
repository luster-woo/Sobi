import { useNavigate } from 'react-router-dom'
import type { Loan } from '@/shared/types'
import Modal from '@/shared/ui/Modal'
import Button from '@/shared/ui/Button'
import Tag from '@/shared/ui/Tag'
import JudgementBadge from '@/shared/ui/JudgementBadge'
import DefinitionList from '@/shared/ui/DefinitionList'
import { IconBookmark } from '@/shared/ui/Icon'
import { formatManWon, formatMonthDay } from '@/shared/lib/format'

interface Props {
  loan: Loan | null
  onClose: () => void
  onToggleBookmark: (id: string) => void
}

/** 13-1. 대출 상품 상세 — 목록 위 모달 */
export default function LoanDetailModal({ loan, onClose, onToggleBookmark }: Props) {
  const navigate = useNavigate()
  if (!loan) return null

  const cta = {
    applied: { label: '신청 내역 보기', to: `/loans/${loan.id}/status` },
    possible: { label: '신청하기', to: `/loans/${loan.id}/apply` },
    holding: { label: '상환 관리로 이동', to: '/repayments' },
    impossible: { label: '신청 불가', to: '' },
  }[loan.judgement]

  return (
    <Modal open onClose={onClose} title={loan.name} className="max-w-[620px]">
      <div className="-mt-4 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <p className="typo-body2 text-text-secondary">{loan.description}</p>
          <div className="flex shrink-0 items-center gap-3">
            <JudgementBadge value={loan.judgement} />
            <button
              type="button"
              onClick={() => onToggleBookmark(loan.id)}
              className="inline-flex items-center gap-1 typo-body2 text-text"
            >
              <IconBookmark size={16} filled={loan.bookmarked} className={loan.bookmarked ? 'text-primary' : 'text-text-muted'} />
              {loan.bookmarked ? '저장됨' : '저장'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {loan.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          {loan.deadline && <Tag>~ {formatMonthDay(loan.deadline)}</Tag>}
        </div>

        <hr className="border-0 h-px bg-border-subtle" />

        <DefinitionList
          items={[
            { label: '금리', value: <span className="typo-h4 font-semibold">연 {loan.rate}% (고정)</span> },
            {
              label: '한도',
              value: loan.minAmount
                ? `최소 ${formatManWon(loan.minAmount)}에서 최대 ${formatManWon(loan.limitAmount)}`
                : `최대 ${formatManWon(loan.limitAmount)}`,
            },
            { label: '상환', value: loan.repayment },
            { label: '업력', value: `${loan.minMonths}개월 이상` },
            { label: '대상', value: loan.target },
            { label: '신용등급', value: loan.creditScore },
            { label: '실행', value: loan.execution },
          ]}
        />

        <Button
          className="w-full"
          disabled={!cta.to}
          onClick={() => {
            onClose()
            navigate(cta.to)
          }}
        >
          {cta.label}
        </Button>
      </div>
    </Modal>
  )
}
