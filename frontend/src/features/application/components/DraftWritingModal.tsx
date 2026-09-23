import { useEffect, useState } from 'react'

import { useMyPage } from '@/features/mypage/hooks/useMyPage'
import { useEstimatedProgress } from '@/shared/hooks/useEstimatedProgress'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import Modal from '@/shared/ui/Modal'
import { cn } from '@/shared/utils/cn'

/**
 * 예상 소요. 서버 read timeout 은 300초지만 실제 응답은 그보다 한참 빠르다 —
 * 예상을 timeout 에 맞춰 두면 막대가 한 자릿수에 머물다 응답을 맞고, 그 한 번에 다 찬다.
 */
const EXPECTED_MS = 45_000

/** 칸 하나를 채우기 시작하는 간격과 글자 하나를 찍는 간격 */
const ROW_MS = 260
const CHAR_MS = 26
/** 서술 칸의 줄 하나가 써지는 시간 */
const LINE_MS = 900
const PROSE_LINES = [100, 72]

/**
 * 응답 전에 마지막 줄이 멈춰 서는 지점.
 *
 * 종이는 스스로 완성되지 않는다 — 남은 분량이 '아직 안 끝났다' 는 표시다.
 * 진행바가 95% 앞에서 기다리는 것과 같은 이유다(`shared/utils/estimatedProgress.ts`).
 */
const LAST_LINE_CAP = 0.82

/**
 * 응답이 온 뒤 남은 칸을 마저 쓰는 시간.
 *
 * `useEstimatedProgress` 가 막대를 100 까지 채우는 시간과 맞춘다 — 막대가 다 차는
 * 순간 종이도 다 써져야 도장이 따로 논다.
 */
const FINISH_MS = 1200
/** 다 쓴 종이와 도장을 보여주고 닫힐 때까지 */
const RESULT_HOLD_MS = 1400
/** 이만큼 지나야 오래 걸릴 수 있다고 말한다. 보통은 그 전에 끝난다 */
const LONG_WAIT_MS = 15_000
const TICK_MS = 50

/** 쓰는 중 → 응답을 받아 남은 칸을 마저 쓰는 중 → 다 씀(도장) */
type Phase = 'writing' | 'finishing' | 'done'

type Source = 'USER' | 'BUSINESS' | 'MYDATA'

const SOURCE_LABEL: Record<Source | 'AI', string> = {
  USER: '내 정보',
  BUSINESS: '사업자',
  MYDATA: '마이데이터',
  AI: 'AI 작성',
}

const SOURCE_CLASS: Record<Source | 'AI', string> = {
  USER: 'bg-bg-canvas text-text-secondary',
  BUSINESS: 'bg-primary-soft text-primary',
  MYDATA: 'bg-progress-soft text-progress',
  AI: 'bg-warning-soft text-warning',
}

interface Row {
  label: string
  value: string
  source: Source
}

function SourceTag({ source }: { source: Source | 'AI' }) {
  return (
    <span
      className={cn(
        'text-caption shrink-0 rounded-full px-2 py-0.5 font-semibold',
        SOURCE_CLASS[source],
      )}
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

/**
 * 초안에 쓰는 내 정보. 화면이 이미 가진 값만 쓴다.
 *
 * AI 는 서식마다 다른 칸을 채우고 어떤 칸을 채웠는지 알려주지 않는다(값은 개인정보라
 * 응답에 싣지 않는다). 그래서 이 종이는 실제 서식이 아니라, AI 가 읽어 가는 출처
 * (`ai/app/agent/sources` 의 USER · BUSINESS · MYDATA)를 보여주는 그림이다.
 */
function useRows(): Row[] {
  const { data } = useMyPage()
  const birthDate = useAuthStore((state) => state.user?.birthDate ?? null)

  const rows: Row[] = []
  if (data?.profile.name) rows.push({ label: '성명', value: data.profile.name, source: 'USER' })
  if (birthDate) rows.push({ label: '생년월일', value: birthDate, source: 'USER' })

  const business = data?.business
  if (business) {
    rows.push(
      { label: '상호', value: business.businessName, source: 'BUSINESS' },
      { label: '사업자등록번호', value: business.brn, source: 'BUSINESS' },
      { label: '사업장 주소', value: business.address, source: 'BUSINESS' },
      { label: '업종', value: business.industryName, source: 'BUSINESS' },
      { label: '개업일', value: business.openDate, source: 'BUSINESS' },
    )
  }
  // 매출·세금은 AI 가 마이데이터로 계산한다. 화면은 그 값을 모른다
  if (data?.myData) rows.push({ label: '매출·세금', value: '마이데이터로 계산', source: 'MYDATA' })

  return rows
}

function useElapsed() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return elapsed
}

function DraftPaper({ documentName, phase }: { documentName: string; phase: Phase }) {
  const rows = useRows()
  const elapsed = useElapsed()

  const { percent } = useEstimatedProgress({
    defs: [],
    expectedMs: EXPECTED_MS,
    minMs: 400,
    settled: phase !== 'writing',
  })

  /**
   * 응답이 온 순간의 경과 시간.
   *
   * 여기서 종이 시계를 멈추고 남은 분량만 `ratio` 로 메운다. 응답이 왔다고 값을 그대로
   * 꽂으면 쓰던 칸과 아직 시작도 안 한 칸이 **동시에** 차서 한 번에 튄다 —
   * 응답이 예상보다 빠를수록 안 쓴 칸이 많아 더 크게 튄다.
   */
  const [mark, setMark] = useState<number | null>(null)
  if (phase !== 'writing' && mark === null) setMark(elapsed)

  const clock = mark ?? elapsed
  const ratio = mark === null ? 0 : Math.min(1, (elapsed - mark) / FINISH_MS)
  /** 멈춘 시점의 값에서 완성까지 이어 채운다. 응답 전에는 그대로 둔다 */
  const fill = (base: number, full: number) => (mark === null ? base : base + (full - base) * ratio)

  const typed = (index: number, value: string) => {
    const chars = Math.floor((clock - index * ROW_MS) / CHAR_MS)
    const base = Math.min(value.length, Math.max(0, chars))
    return value.slice(0, Math.round(fill(base, value.length)))
  }

  const proseStart = rows.length * ROW_MS
  const proseFill = (index: number, last: boolean) => {
    const cap = last ? LAST_LINE_CAP : 1
    const base = Math.min(cap, Math.max(0, (clock - proseStart - index * LINE_MS) / LINE_MS))
    return fill(base, 1)
  }

  const done = phase === 'done'
  const writingProse = clock >= proseStart

  const waitingText =
    mark === null && elapsed >= LONG_WAIT_MS ? (
      <>
        내 정보와 마이데이터를 읽어 서식을 채우고 있어요.{' '}
        <b className="text-text">최대 5분 가량 소요될 수 있습니다.</b> 창을 닫지 말고 기다려 주세요.
      </>
    ) : (
      '내 정보와 마이데이터를 읽어 서식을 채우고 있어요. 창을 닫지 말고 기다려 주세요.'
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border bg-surface relative overflow-hidden rounded-sm border px-5 py-3 shadow-sm">
        <p className="text-body1 text-text mb-2 text-center font-bold tracking-[0.2em]">
          {documentName}
        </p>

        <div className="border-border-strong border-t border-b">
          <dl>
            {rows.map((row, index) => {
              const text = typed(index, row.value)
              const typing = !done && text.length > 0 && text.length < row.value.length

              return (
                <div
                  key={row.label}
                  className="border-border flex min-w-0 items-center gap-2 border-b py-1 last:border-b-0"
                >
                  <dt className="text-caption text-text-secondary w-20 shrink-0">{row.label}</dt>
                  <dd className="text-caption text-text min-h-5 min-w-0 flex-1 truncate font-medium">
                    {text}
                    {typing && (
                      <span className="bg-primary ml-px inline-block h-3 w-px animate-pulse align-middle" />
                    )}
                  </dd>
                  <span
                    className={cn(
                      'transition-opacity duration-300',
                      text.length > 0 ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    <SourceTag source={row.source} />
                  </span>
                </div>
              )
            })}
          </dl>

          <div className="border-border border-t py-1.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-caption text-text-secondary">서술형 항목</span>
              <span
                className={cn(
                  'transition-opacity duration-300',
                  writingProse ? 'opacity-100' : 'opacity-0',
                )}
              >
                <SourceTag source="AI" />
              </span>
            </div>
            <span className="flex flex-col gap-1.5">
              {PROSE_LINES.map((width, index) => {
                const last = index === PROSE_LINES.length - 1
                const value = proseFill(index, last)
                /* 응답을 기다리는 동안 마지막 줄은 여기 서 있다. 고쳐 쓰는 중으로 보이게 둔다 */
                const stalled = mark === null && last && value >= LAST_LINE_CAP

                return (
                  <span
                    key={index}
                    className="bg-bg-canvas block h-2 rounded-full"
                    style={{ width: `${width}%` }}
                  >
                    <span
                      className={cn(
                        'bg-text-secondary/40 block h-full rounded-full transition-[width] duration-100 ease-linear',
                        stalled && 'animate-pulse',
                      )}
                      style={{ width: `${value * 100}%` }}
                    />
                  </span>
                )
              })}
            </span>
          </div>

          <div className="border-border flex items-center gap-2 border-t py-1">
            <span className="text-caption text-text-secondary w-20 shrink-0">서명·날인</span>
            <span className="text-caption text-text-muted border-border-strong rounded-sm border border-dashed px-2 py-0.5">
              직접 기재
            </span>
          </div>
        </div>

        {done && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="border-primary text-primary bg-surface/85 animate-stamp-in text-h2 -rotate-[14deg] rounded-md border-4 px-5 py-2 font-extrabold tracking-widest">
              작성 완료
            </span>
          </span>
        )}
      </div>

      <div className="bg-bg-canvas h-2 overflow-hidden rounded-full">
        <div
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="초안 생성 진행률"
          className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-body2 text-text-secondary break-keep">
        {done
          ? '서명·날인처럼 직접 채울 칸은 비워 뒀어요. 받은 초안을 확인하고 올려주세요.'
          : waitingText}
      </p>
    </div>
  )
}

interface DraftWritingModalProps {
  /** 초안 요청 상태. useWriteDraft 의 status 를 그대로 받는다 */
  status: 'idle' | 'pending' | 'success' | 'error'
  documentName: string
}

/**
 * 초안 만드는 중 화면. 빈 서식이 내 정보로 한 칸씩 채워지는 모습을 보여준다.
 *
 * 진행률은 **추정값이다.** 서버가 응답 하나만 주고 그 사이 어디까지 했는지 알려주지
 * 않는다. 칸이 채워지는 속도도 실제 작성 순서가 아니라 연출이다.
 *
 * 응답이 오면 **바로 도장을 찍지 않는다.** 쓰던 자리에서 남은 칸을 `FINISH_MS` 동안
 * 마저 쓰고 그다음에 찍는다 — 값을 그대로 꽂으면 종이·서술 칸·도장·막대가 같은
 * 프레임에 한꺼번에 튀고, 응답이 빠를수록 더 크게 튄다.
 *
 * 닫을 수 없다 — 창을 닫아도 요청은 계속 돌고, 다 만든 파일을 받을 자리가 사라진다.
 * 실패면 바로 닫는다(토스트가 알린다).
 */
export default function DraftWritingModal({ status, documentName }: DraftWritingModalProps) {
  const [showing, setShowing] = useState(false)
  const [phase, setPhase] = useState<Phase>('writing')

  if (status === 'pending' && !showing) {
    setShowing(true)
    setPhase('writing')
  }
  if (status === 'error' && showing) setShowing(false)
  if (status === 'success' && showing && phase === 'writing') setPhase('finishing')

  /* 마저 쓰고(FINISH_MS) → 도장을 보여주고(RESULT_HOLD_MS) 닫는다 */
  useEffect(() => {
    if (phase === 'writing') return

    if (phase === 'finishing') {
      const timer = window.setTimeout(() => setPhase('done'), FINISH_MS)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setShowing(false), RESULT_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <Modal
      open={showing}
      onClose={() => {}}
      title={phase === 'done' ? '초안을 만들었어요' : '초안을 만들고 있어요'}
      size="lg"
    >
      <DraftPaper documentName={documentName} phase={phase} />
    </Modal>
  )
}
