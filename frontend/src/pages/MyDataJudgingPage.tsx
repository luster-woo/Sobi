import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import JobProgressPanel from '@/features/mydata/components/JobProgressPanel'
import { useMydataLinkResult } from '@/features/mydata/hooks/useMydata'
import { ROUTES } from '@/shared/constants/routes'
import { useEstimatedProgress } from '@/shared/hooks/useEstimatedProgress'
import Spinner from '@/shared/ui/Spinner'
import type { JobStepDef } from '@/shared/utils/estimatedProgress'

/**
 * 이 화면이 머무는 시간. 디자인의 '약 10초' 보다 짧게 잡았다.
 *
 * ⚠️ 기다리는 일이 없다. 판정은 `POST /mydata/link` 안에서 이미 끝났고 결과도 받아뒀다.
 *    그래서 `settled: true` 로 두고 단순한 타이머로 돌린다 — 무엇을 했는지 보여주는
 *    구간이지 무엇을 기다리는 구간이 아니다.
 */
const DURATION_MS = 6000

/** 연동 결과를 못 읽었을 때. 이 화면을 직접 열었거나 새로고침한 경우다 */
const FALLBACK_TOTAL = 20

const STEPS: JobStepDef[] = [
  { key: 'BUSINESS', label: '사업자 정보 확인' },
  { key: 'MYDATA', label: '마이데이터 최신본 불러오기' },
  { key: 'JUDGE', label: '상품별 자격 요건 대조' },
]

/**
 * 화면 12. 자격 판정 로딩.
 *
 * 대출 목록이 아니라 온보딩 마지막 단계다 — 판정은 마이데이터 연동 job 안에서 끝나므로
 * 목록에 들어갈 때는 판정할 것이 남아 있지 않다. 사이드바를 붙이지 않는 이유도 같다.
 * 이 시점의 사용자는 대시보드를 아직 본 적이 없다.
 */
export function MyDataJudgingPage() {
  const navigate = useNavigate()

  const total = useMydataLinkResult()?.totalCount ?? FALLBACK_TOTAL

  const { percent, steps, done } = useEstimatedProgress({
    defs: STEPS,
    expectedMs: DURATION_MS,
    minMs: DURATION_MS,
    settled: true,
  })

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

      <JobProgressPanel
        steps={steps}
        percent={percent}
        label="자격 판정 진행률"
        barFirst
        summary={
          <>
            {total}개 상품 중{' '}
            <b className="font-semibold tabular-nums">{Math.round((percent / 100) * total)}개</b>{' '}
            판정 완료
          </>
        }
      />
    </div>
  )
}
