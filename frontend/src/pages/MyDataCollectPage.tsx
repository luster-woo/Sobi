import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { type JobStepDef, useJobProgress } from '@/features/auth/hooks/useJobProgress'
import { ROUTES } from '@/shared/constants/routes'
import ProgressBar from '@/shared/ui/ProgressBar'
import Spinner from '@/shared/ui/Spinner'
import StepList from '@/shared/ui/StepList'

/** 연동에 걸리는 시간(ms). 서버 폴링이 붙으면 의미가 없어진다 */
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
 * 진행률은 `useJobProgress` 가 시간으로 만든다 — 서버가 아직 진행 상태를 주지 않는다.
 * 훅 반환값이 요청해둔 폴링 응답과 같은 모양이라, 비동기 전환 후에는 훅만 갈아끼우면 된다.
 */
export function MyDataCollectPage() {
  const navigate = useNavigate()
  const { percent, steps, done } = useJobProgress(STEPS, DURATION_MS)

  useEffect(() => {
    if (!done) return

    // 수집이 끝나면 판정 단계로. 같은 job 의 다음 구간이다
    const timer = window.setTimeout(() => navigate(ROUTES.MYDATA_JUDGING, { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

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
    </div>
  )
}
