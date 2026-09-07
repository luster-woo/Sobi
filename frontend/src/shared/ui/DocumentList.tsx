import type { SubmitDocument, WriteDocument } from '@/shared/types'
import Badge from './Badge'
import Button from './Button'
import { cn } from '@/shared/lib/format'

interface DocumentListProps {
  submit: SubmitDocument[]
  write: WriteDocument[]
  /** 목업: 업로드/다시 업로드 클릭 시 검증 통과 처리 */
  onUpload: (id: string) => void
}

function StatusPill({ status }: { status: SubmitDocument['status'] }) {
  if (status === 'passed') return <Badge variant="solid">검증 통과</Badge>
  if (status === 'checking')
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-border-strong px-3 typo-badge text-text-secondary">
        검증 중
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-danger px-3 typo-badge text-danger">
        검증 실패
      </span>
    )
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-dashed border-border-strong px-3 typo-badge text-text-disabled">
      미제출
    </span>
  )
}

/** 13-2 · 14-2 신청 화면의 제출 서류 / 작성 서류 목록 */
export default function DocumentList({ submit, write, onUpload }: DocumentListProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="typo-h4">제출 서류</h2>
        <ul className="space-y-2">
          {submit.map((d) => {
            const missing = d.status === 'missing'
            return (
              <li
                key={d.id}
                className={cn(
                  'flex items-center justify-between gap-4 rounded-lg px-5 py-4',
                  missing
                    ? 'border border-dashed border-border-strong bg-surface-muted'
                    : d.status === 'failed'
                      ? 'border border-border-strong bg-surface'
                      : 'border border-border bg-surface',
                )}
              >
                {missing ? (
                  <button type="button" onClick={() => onUpload(d.id)} className="min-w-0 flex-1 text-left">
                    <p className="typo-body1">+ {d.name} 끌어오거나 클릭해서 업로드</p>
                    <p className="mt-1 typo-caption text-text-muted">{d.detail}</p>
                  </button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="typo-h4 font-semibold">{d.name}</p>
                    <p className="mt-1 typo-body2 text-text-secondary">{d.detail}</p>
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={d.status} />
                  {d.status === 'failed' && (
                    <Button variant="outline" size="sm" onClick={() => onUpload(d.id)}>
                      다시 업로드
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="typo-h4">작성 서류</h2>
        <ul className="space-y-2">
          {write.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-3">
              <p className="typo-h4 font-semibold">{w.name}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  원본 받기
                </Button>
                <Button variant="outline" size="sm">
                  초안 작성본 받기
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
