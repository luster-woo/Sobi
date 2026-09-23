import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { useLoans } from '@/features/loan/hooks/useLoans'
import JobProgressPanel from '@/features/mydata/components/JobProgressPanel'
import { useMydataLinkResult } from '@/features/mydata/hooks/useMydata'
import type { MydataLinkResult } from '@/features/mydata/model/types'
import { ROUTES } from '@/shared/constants/routes'
import { useEstimatedProgress } from '@/shared/hooks/useEstimatedProgress'
import Button from '@/shared/ui/Button'
import Spinner from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'
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

function CheckBadge() {
  return (
    <span className="bg-primary-soft text-primary animate-fade-slide-in flex size-11 items-center justify-center rounded-full">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12.5 4.5 4.5L19 7" />
      </svg>
    </span>
  )
}

/**
 * 신청할 수 있는 것을 한 문장으로.
 *
 * 대출 개수는 연동 응답에 없다 — 대출도 같은 job 에서 판정하지만(MydataStore 가
 * suggest_loan 을 채운다) 응답은 AI 가 판정한 지원사업 개수만 담는다. 그래서 대출은
 * 목록 API 의 statusCounts 로 센다. 대시보드도 같은 방식이라 두 화면 숫자가 맞는다.
 */
function toHeadline(programs: number, loans: number | null): string {
  const parts: string[] = []
  if (programs > 0) parts.push(`지원사업 ${programs}개`)
  if (loans) parts.push(`대출 ${loans}개`)

  if (parts.length === 0) return '지금 조건에 맞는 상품이 없어요'
  return `신청할 수 있는 ${parts.join(', ')}를 찾았어요`
}

function MatchResult({
  result,
  eligibleLoans,
  onNext,
}: {
  result: MydataLinkResult
  eligibleLoans: number | null
  onNext: () => void
}) {
  return (
    <>
      <CheckBadge />

      <h1 className="text-h2 text-center tracking-[-0.02em]">
        {toHeadline(result.eligibleCount, eligibleLoans)}
      </h1>

      <p className="text-body2 text-text-muted text-center">
        마이데이터로 확인한 매출·업력·부채비율·신용등급을 상품 요건과 대조했어요
      </p>

      <Button className="w-full" onClick={onNext}>
        대시보드로 가기
      </Button>
    </>
  )
}

/**
 * 화면 12. 자격 판정 로딩.
 *
 * 대출 목록이 아니라 온보딩 마지막 단계다 — 판정은 마이데이터 연동 job 안에서 끝나므로
 * 목록에 들어갈 때는 판정할 것이 남아 있지 않다. 사이드바를 붙이지 않는 이유도 같다.
 * 이 시점의 사용자는 대시보드를 아직 본 적이 없다.
 *
 * 진행이 끝나면 판정 결과를 보여주고 사용자가 넘어간다. 결과가 없으면(직접 열었거나
 * 새로고침) 보여줄 것이 없어서 예전처럼 바로 대시보드로 보낸다.
 */
export function MyDataJudgingPage() {
  const navigate = useNavigate()

  const result = useMydataLinkResult()

  /*
   * 대출은 연동 응답에 개수가 없어서 목록 API 로 센다. 못 받으면 지원사업만 센다 —
   * 덤으로 붙이는 숫자라 이것 때문에 이 화면을 막지 않는다.
   */
  const { data: loans } = useLoans({})
  const eligibleLoans = loans?.statusCounts.ELIGIBLE ?? null
  const total = (result?.totalCount ?? FALLBACK_TOTAL) + (loans?.totalCount ?? 0)

  const { percent, steps, done } = useEstimatedProgress({
    defs: STEPS,
    expectedMs: DURATION_MS,
    minMs: DURATION_MS,
    settled: true,
  })

  const showResult = done && result !== undefined
  const goDashboard = () => navigate(ROUTES.DASHBOARD, { replace: true })

  useEffect(() => {
    if (!done || result) return

    const timer = window.setTimeout(() => navigate(ROUTES.DASHBOARD, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, result, navigate])

  return (
    /*
     * 결과는 내용이 짧아 위에 붙으면 화면이 비어 보인다. 화면 한가운데에 둔다(my-auto —
     * 부모 main 이 남은 높이를 채우는 flex-col 이다). 진행 중에는 예전처럼 위에서 시작한다.
     */
    <div
      className={cn(
        'flex w-full max-w-[460px] flex-col items-center gap-5 text-center',
        showResult ? 'my-auto pb-12' : 'pt-6',
      )}
    >
      {showResult ? (
        <MatchResult result={result} eligibleLoans={eligibleLoans} onNext={goDashboard} />
      ) : (
        <>
          <Spinner size={44} label="자격을 판정하는 중" />

          <h1 className="text-h2 tracking-[-0.02em]">내 사업체 기준으로 상품을 고르고 있어요</h1>

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
                상품 {total}개 중{' '}
                <b className="font-semibold tabular-nums">
                  {Math.round((percent / 100) * total)}개
                </b>{' '}
                판정 완료
              </>
            }
          />
        </>
      )}
    </div>
  )
}
