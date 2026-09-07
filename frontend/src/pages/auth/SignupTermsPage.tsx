import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Checkbox from '@/shared/ui/Checkbox'
import { IconChevronRight } from '@/shared/ui/Icon'

const TERMS = [
  { id: 'service', label: '[필수] 서비스 이용약관', required: true },
  { id: 'privacy', label: '[필수] 개인정보 수집·이용 동의', required: true },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신 동의', required: false },
]

/** 03. 약관 동의 */
export default function SignupTermsPage() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Record<string, boolean>>({ service: true, privacy: true, marketing: false })
  const [openTerm, setOpenTerm] = useState<string | null>(null)

  const allChecked = TERMS.every((t) => checked[t.id])
  const requiredOk = TERMS.filter((t) => t.required).every((t) => checked[t.id])

  const toggleAll = (v: boolean) => setChecked(Object.fromEntries(TERMS.map((t) => [t.id, v])))

  return (
    <div className="mx-auto max-w-[540px] pt-16">
      <div className="text-center">
        <h1 className="typo-h1">서비스 이용을 위해 동의가 필요해요</h1>
        <p className="mt-3 typo-body1 text-text-secondary">필수 항목에 모두 동의하면 다음으로 넘어갈 수 있어요.</p>
      </div>

      <Card className="mt-10 space-y-1 p-4">
        <div className="flex items-center justify-between rounded-md px-2 py-3">
          <Checkbox
            label={<span className="typo-label-sm">전체 동의</span>}
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <IconChevronRight size={16} className="text-text-muted" />
        </div>
        <hr className="border-0 h-px bg-border-subtle" />
        {TERMS.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-2 py-2">
            <Checkbox
              label={t.label}
              checked={checked[t.id]}
              onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))}
            />
            <button
              type="button"
              aria-label={`${t.label} 전문 보기`}
              onClick={() => setOpenTerm(openTerm === t.id ? null : t.id)}
              className="text-text-muted hover:text-text"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        ))}

        <div className="mt-3 rounded-md bg-surface-muted p-5">
          <p className="typo-body2 leading-relaxed text-text-secondary">
            제1조 (목적) 이 약관은 소상공인 도우미가 제공하는 서비스의 이용 조건과 절차, 이용자와 회사의 권리·의무 및
            책임사항을 규정함을 목적으로 합니다.
            <br />
            제2조 (정의) ...
          </p>
          <p className="mt-6 typo-caption text-text-disabled">
            {openTerm ? `${TERMS.find((t) => t.id === openTerm)?.label} 전문` : '약관 전문 — 클릭 시 아코디언으로 펼침'}
          </p>
        </div>
      </Card>

      <Button size="lg" className="mt-6 w-full" disabled={!requiredOk} onClick={() => navigate('/signup')}>
        다음
      </Button>
    </div>
  )
}
