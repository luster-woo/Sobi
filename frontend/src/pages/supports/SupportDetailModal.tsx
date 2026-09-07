import { useNavigate } from 'react-router-dom'

import Button from '@/components/common/Button'
import DefinitionList from '@/components/common/DefinitionList'
import { IconBookmark } from '@/components/common/Icon'
import JudgementBadge from '@/components/common/JudgementBadge'
import Modal from '@/components/common/Modal'
import Tag from '@/components/common/Tag'
import type { Support } from '@/types'
import { dday, formatDate, formatMonthDay } from '@/utils/format'

interface Props {
  support: Support | null
  onClose: () => void
  onToggleBookmark: (id: string) => void
}

/** 14-1. 지원금 상세 — 목록 위 모달 */
export default function SupportDetailModal({ support, onClose, onToggleBookmark }: Props) {
  const navigate = useNavigate()
  if (!support) return null
  const s = support

  const cta = {
    applied: { label: '지급 내역 보기', to: `/supports/${s.id}/status` },
    possible: { label: '신청하기', to: `/supports/${s.id}/apply` },
    holding: { label: '지급 내역 보기', to: `/supports/${s.id}/status` },
    impossible: { label: '신청 불가', to: '' },
  }[s.judgement]

  return (
    <Modal open onClose={onClose} title={s.name} className="max-w-[620px]">
      <div className="-mt-4 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <p className="typo-body2 text-text-secondary">{s.description}</p>
          <div className="flex shrink-0 items-center gap-3">
            <JudgementBadge value={s.judgement} />
            <button
              type="button"
              onClick={() => onToggleBookmark(s.id)}
              className="typo-body2 inline-flex items-center gap-1"
            >
              <IconBookmark
                size={16}
                filled={s.bookmarked}
                className={s.bookmarked ? 'text-primary' : 'text-text-muted'}
              />
              {s.bookmarked ? '저장됨' : '저장'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {s.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          {s.deadline && <Tag>~{formatMonthDay(s.deadline)}</Tag>}
        </div>

        <hr className="bg-border-subtle h-px border-0" />

        <DefinitionList
          items={[
            { label: '소관', value: s.agency },
            { label: '유형', value: s.type },
            {
              label: '금액',
              value: <span className="typo-h4 font-semibold">{s.amountLabel}</span>,
            },
            {
              label: '접수',
              value: s.deadline
                ? `~ ${formatDate(s.deadline)} 18:00 · D-${dday(s.deadline)}`
                : '상시 접수',
            },
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
