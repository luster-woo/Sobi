import { useState } from 'react'

import { TERMS } from '@/features/auth/model/terms'
import Checkbox from '@/shared/ui/Checkbox'
import { cn } from '@/shared/utils/cn'

interface TermsAgreementListProps {
  /** 동의한 항목 id 집합 */
  agreed: string[]
  onChange: (agreed: string[]) => void
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-3.5 transition-transform', open && 'rotate-90')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

/**
 * 전체 동의 + 항목별 체크 + 전문 펼치기.
 *
 * 동의 상태를 스스로 들고 있지 않다. 다음 버튼 활성화를 부모가 판단해야 하고,
 * 나중에 가입 요청 body 에 실어야 해서 값은 부모에 둔다.
 */
export default function TermsAgreementList({ agreed, onChange }: TermsAgreementListProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  const allAgreed = agreed.length === TERMS.length

  const toggleAll = () => onChange(allAgreed ? [] : TERMS.map((term) => term.id))

  const toggleOne = (id: string) =>
    onChange(agreed.includes(id) ? agreed.filter((agreedId) => agreedId !== id) : [...agreed, id])

  return (
    <div className="border-border bg-surface w-full max-w-[560px] overflow-hidden rounded-md border">
      <div className="border-border bg-surface-muted border-b px-4 py-3.5">
        <Checkbox
          label={<span className="text-body1 font-medium">전체 동의</span>}
          checked={allAgreed}
          onChange={toggleAll}
        />
      </div>

      <ul>
        {TERMS.map((term) => {
          const open = openId === term.id

          return (
            <li key={term.id} className="border-border-subtle border-b last:border-b-0">
              <div className="flex items-center gap-2.5 px-4 py-2.5">
                <Checkbox
                  className="min-w-0 flex-1"
                  label={
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-caption rounded-[3px] px-1.5 py-px font-medium',
                          term.required
                            ? 'bg-primary-soft text-primary'
                            : 'bg-border-subtle text-text-muted',
                        )}
                      >
                        {term.required ? '필수' : '선택'}
                      </span>
                      {term.title}
                    </span>
                  }
                  checked={agreed.includes(term.id)}
                  onChange={() => toggleOne(term.id)}
                />

                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`${term.title} 전문 ${open ? '접기' : '펼치기'}`}
                  onClick={() => setOpenId(open ? null : term.id)}
                  className="text-text-disabled hover:text-text-secondary shrink-0 p-1 transition-colors"
                >
                  <ChevronIcon open={open} />
                </button>
              </div>

              {/* 전문은 길어서 스크롤 영역으로 가둔다. 카드 전체가 늘어나면 다음 버튼이 화면 밖으로 밀린다 */}
              {open && (
                <div className="border-border-subtle bg-surface-muted max-h-[200px] overflow-y-auto border-t px-4 py-3.5">
                  <p className="text-caption text-text-secondary leading-[1.75] whitespace-pre-line">
                    {term.body}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
