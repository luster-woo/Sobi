import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { type JobStepDef, useJobProgress } from '@/features/auth/hooks/useJobProgress'
import { useMydataLink, useMydataLinkState } from '@/features/mydata/hooks/useMydata'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import ProgressBar from '@/shared/ui/ProgressBar'
import Spinner from '@/shared/ui/Spinner'
import StepList from '@/shared/ui/StepList'

/** 진행률 막대가 차는 데 걸리는 시간(ms). 서버 폴링이 붙으면 의미가 없어진다 (375) */
const DURATION_MS = 7000

/**
 * 폴링 응답의 `steps` 중 수집 구간. 판정(JUDGE)은 화면 12 가 이어서 보여준다.
 */
const STEPS: JobStepDef[] = [
  { key: 'ACCOUNT', label: '계좌 거래 내역', doneNote: '2개 기관 완료' },
  { key: 'SALES', label: '매출·현금 흐름', doneNote: '24개월 완료' },
  { key: 'CREDIT', label: '신용 정보', doneNote: '완료' },
]

/**
 * 화면 09. 마이데이터 수집 중.
 *
 * 진행률 숫자는 아직 시간으로 만든다 — 서버가 진행 상태를 주지 않는다 (375).
 * 다만 **다음 화면으로 넘어가는 시점은 실제 응답이 정한다.** 막대가 100% 라도
 * `POST /mydata/link` 가 안 끝났으면 기다린다. 먼저 넘기면 판정 화면이 아직 저장되지도
 * 않은 결과를 읽는다.
 */
export function MyDataCollectPage() {
  const navigate = useNavigate()
  const { percent, steps, done } = useJobProgress(STEPS, DURATION_MS)

  const link = useMydataLink()
  const linkStatus = useMydataLinkState()

  /*
   * `undefined` 는 이 주소를 직접 열었거나 새로고침한 경우다. 그때는 막지 않는다 —
   * 서버 쪽 수집은 계속 돌고 있을 수 있는데 다시 쏘면 판정이 한 번 더 돈다.
   */
  const failed = linkStatus === 'error'
  const settled = linkStatus === undefined || linkStatus === 'success'

  useEffect(() => {
    if (!done || !settled) return

    const timer = window.setTimeout(() => navigate(ROUTES.MYDATA_JUDGING, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, settled, navigate])

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

      <div className="border-border bg-surface w-full overflow-hidden rounded-md border">
        <StepList
          steps={[
            { key: 'IDENTITY', label: '본인 인증', status: 'DONE', note: '휴대폰 인증 완료' },
            ...steps,
          ]}
        />

        <div className="border-border-subtle border-t px-4 py-3.5">
          <ProgressBar value={percent} showValue label="마이데이터 수집 진행률" />
        </div>
      </div>

      {/* 막대가 다 찼는데 응답이 안 온 구간. 멈춘 것처럼 보이면 사용자가 새로고침한다 */}
      {done && !settled && (
        <p className="text-body2 text-text-muted text-center">
          거의 다 됐어요. 기관 응답을 기다리는 중이라 조금 더 걸릴 수 있어요.
        </p>
      )}
    </div>
  )
}
