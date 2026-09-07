import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Spinner from '@/shared/ui/Spinner'
import ProgressBar from '@/shared/ui/ProgressBar'
import { IconCheckCircle } from '@/shared/ui/Icon'
import { cn } from '@/shared/lib/format'

const STEPS = [
  { label: '본인 인증', done: '휴대폰 인증 완료' },
  { label: '계좌 거래 내역', done: '2개 기관 완료' },
  { label: '매출·현금 흐름', done: '3개 기관 완료' },
  { label: '신용 정보', done: '완료' },
]

/** 09. 마이데이터 수집 중 — 단계가 차례로 완료되고 대시보드로 이동 */
export default function MydataLoadingPage() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(60) // 0~100, 목업은 60%부터 시작

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 5)), 350)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => navigate('/dashboard', { replace: true }), 600)
      return () => clearTimeout(t)
    }
  }, [progress, navigate])

  const doneCount = Math.min(STEPS.length, Math.floor(progress / 25))
  const current = doneCount

  return (
    <div className="flex flex-col items-center pt-40">
      <Spinner />
      <h1 className="mt-8 typo-h2">금융 데이터를 안전하게 가져오는 중이에요</h1>

      <Card className="mt-12 w-[460px] space-y-1 p-6">
        {STEPS.map((s, i) => {
          const isDone = i < doneCount
          const isCurrent = i === current && progress < 100
          const isWait = i > current
          return (
            <div
              key={s.label}
              className={cn('flex items-center justify-between py-3', i > 0 && 'border-t border-border-subtle')}
            >
              <span className="flex items-center gap-3">
                {isDone ? (
                  <IconCheckCircle size={18} className="text-primary" />
                ) : (
                  <span
                    className={cn(
                      'size-[18px] rounded-full border-2',
                      isCurrent ? 'border-text-muted' : 'border-border-strong',
                    )}
                  />
                )}
                <span className={cn('typo-body1', isWait && 'text-text-disabled')}>{s.label}</span>
              </span>
              <span className={cn('typo-caption', isWait ? 'text-text-disabled' : 'text-text-muted')}>
                {isDone ? s.done : isCurrent ? `가져오는 중 · ${progress % 25 === 0 ? 60 : (progress % 25) * 4}%` : '대기'}
              </span>
            </div>
          )
        })}
        <ProgressBar value={progress} className="mt-3" />
      </Card>
    </div>
  )
}
