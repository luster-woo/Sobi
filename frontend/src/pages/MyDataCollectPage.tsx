import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import JobProgressPanel from '@/features/mydata/components/JobProgressPanel'
import { useEstimatedProgress } from '@/features/mydata/hooks/useEstimatedProgress'
import { useMydataLink, useMydataLinkState } from '@/features/mydata/hooks/useMydata'
import type { JobStepDef } from '@/features/mydata/model/progress'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import Spinner from '@/shared/ui/Spinner'

/** 백엔드가 밝힌 소요 시간 15~40초의 가운데. 빗나가도 막대가 멈추지는 않는다 */
const EXPECTED_MS = 30_000

/** 목처럼 빨리 끝나도 이 시간은 보여준다. 한 프레임 스치고 사라지면 뭘 했는지 모른다 */
const MIN_MS = 1500

const STEPS: JobStepDef[] = [
  { key: 'IDENTITY', label: '본인 인증' },
  { key: 'ACCOUNT', label: '계좌 거래 내역' },
  { key: 'SALES', label: '매출·현금 흐름' },
  { key: 'CREDIT', label: '신용 정보' },
]

/**
 * 화면 09. 마이데이터 수집 중.
 *
 * 진행률은 **추정값이다.** 서버가 상태를 주지 않아 시간으로 민다 —
 * `features/mydata/model/progress.ts` 주석에 근거를 적어 뒀다.
 *
 * 다음 화면으로 넘어가는 시점만은 추정이 아니라 실제 응답이 정한다. 먼저 넘기면
 * 판정 화면이 아직 저장되지도 않은 결과를 읽는다.
 */
export function MyDataCollectPage() {
  const navigate = useNavigate()

  const link = useMydataLink()
  const linkStatus = useMydataLinkState()

  /*
   * `undefined` 는 이 주소를 직접 열었거나 새로고침한 경우다. 그때는 막지 않는다 —
   * 서버 쪽 수집은 계속 돌고 있을 수 있는데 다시 쏘면 판정이 한 번 더 돈다.
   */
  const failed = linkStatus === 'error'
  const settled = linkStatus === undefined || linkStatus === 'success'

  const { percent, steps, done } = useEstimatedProgress({
    defs: STEPS,
    expectedMs: EXPECTED_MS,
    minMs: MIN_MS,
    settled,
  })

  useEffect(() => {
    if (!done) return

    const timer = window.setTimeout(() => navigate(ROUTES.MYDATA_JUDGING, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

  if (failed) {
    return (
      <div className="flex w-full max-w-[460px] flex-col items-center gap-5 pt-6">
        <h1 className="font-heading text-text text-[21px] font-bold tracking-[-0.02em]">
          금융 데이터를 가져오지 못했어요
        </h1>

        <p className="text-body2 text-text-muted max-w-[42ch] text-center leading-[1.7]">
          연동에 실패했습니다. 다시 시도하거나, 나중에 마이페이지에서 연동할 수 있어요.
        </p>

        <div className="flex w-full gap-2.5">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(ROUTES.DASHBOARD, { replace: true })}
          >
            나중에 하기
          </Button>
          <Button className="flex-1" loading={link.isPending} onClick={() => link.mutate()}>
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-[460px] flex-col items-center gap-5 pt-6">
      <Spinner size={44} label="금융 데이터를 가져오는 중" />

      <h1 className="font-heading text-text text-[21px] font-bold tracking-[-0.02em]">
        금융 데이터를 안전하게 가져오는 중이에요
      </h1>

      <p className="text-body2 text-text-muted max-w-[42ch] text-center leading-[1.7]">
        가져온 정보는 자격 판정에만 쓰이고, 계좌 비밀번호는 저장하지 않아요. 연동은 마이페이지에서
        언제든 해제할 수 있어요.
      </p>

      <JobProgressPanel steps={steps} percent={percent} label="마이데이터 수집 진행률" />

      <p className="text-caption text-text-muted text-center">
        기관 응답에 따라 1분까지 걸릴 수 있어요.
      </p>
    </div>
  )
}
