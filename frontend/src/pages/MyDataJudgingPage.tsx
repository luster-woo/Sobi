import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { type JobStepDef, useJobProgress } from '@/features/auth/hooks/useJobProgress'
import { useMydataLinkResult } from '@/features/mydata/hooks/useMydata'
import { ROUTES } from '@/shared/constants/routes'
import ProgressBar from '@/shared/ui/ProgressBar'
import Spinner from '@/shared/ui/Spinner'
import StepList from '@/shared/ui/StepList'

/** 판정에 걸리는 시간(ms). 디자인의 '약 10초' 보다 짧게 잡았다 */
const DURATION_MS = 6000

/**
 * 연동 결과를 못 읽었을 때 쓸 값. 이 화면을 직접 열었거나 새로고침한 경우다.
 *
 * ⚠️ 실제 판정은 이미 끝나 있다 — `POST /mydata/link` 가 수집과 판정을 함께 끝내고
 *    `totalCount` 를 준다. 이 화면은 그 숫자를 되짚어 보여줄 뿐이다.
 */
const FALLBACK_TOTAL = 20

const STEPS: JobStepDef[] = [
  { key: 'BUSINESS', label: '사업자 정보 확인', doneNote: '완료' },
  { key: 'MYDATA', label: '마이데이터 최신본 불러오기', doneNote: '완료' },
  { key: 'JUDGE', label: '상품별 자격 요건 대조', doneNote: '완료' },
]

/**
 * 화면 12. 자격 판정 로딩.
 *
 * 대출 목록(`/loans`)이 아니라 온보딩 마지막 단계다 — 판정은 마이데이터 연동 job 안에서
 * 끝나므로, 목록에 들어갈 때는 판정할 것이 남아 있지 않다. 사이드바를 붙이지 않는 이유도
 * 같다. 이 시점의 사용자는 대시보드를 아직 본 적이 없다.
 */
export function MyDataJudgingPage() {
  const navigate = useNavigate()
  const { percent, steps, done } = useJobProgress(STEPS, DURATION_MS)

  const total = useMydataLinkResult()?.totalCount ?? FALLBACK_TOTAL
  const judged = Math.round((percent / 100) * total)

  useEffect(() => {
    if (!done) return

    const timer = window.setTimeout(() => navigate(ROUTES.DASHBOARD, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

  return (
    <div className="flex w-full max-w-[460px] flex-col items-center gap-5 pt-6">
      <Spinner size={44} label="자격을 판정하는 중" />

      <h1 className="font-heading text-text text-[21px] font-bold tracking-[-0.02em]">
        내 사업체 기준으로 상품을 고르고 있어요
      </h1>

      <p className="text-body2 text-text-muted text-center">
        매출·업력·부채비율·신용등급을 상품 요건과 대조하는 중
      </p>

      <div className="border-border bg-surface w-full overflow-hidden rounded-md border">
        <div className="border-border-subtle border-b px-4 py-3.5">
          <p className="text-body2 text-text mb-2.5">
            {total}개 상품 중 <b className="font-semibold tabular-nums">{judged}개</b> 판정 완료
          </p>
          <ProgressBar value={percent} showValue label="자격 판정 진행률" />
        </div>

        <StepList steps={steps} />
      </div>
    </div>
  )
}
