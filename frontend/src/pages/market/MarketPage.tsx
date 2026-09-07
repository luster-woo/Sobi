import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import { IconChevronRight } from '@/components/common/Icon'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import Select from '@/components/common/Select'
import StatCard from '@/components/common/StatCard'
import Tag from '@/components/common/Tag'
import { businessCodes, defaultMarketCondition, mockMarketAnalysis } from '@/mocks/market.mock'
import type { MarketAnalysis, MarketCondition } from '@/types'

/** 11-1. 상권 분석·조건 입력 모달 */
function ConditionModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean
  initial: MarketCondition
  onClose: () => void
  onSubmit: (c: MarketCondition) => void
}) {
  const [c, setC] = useState(initial)
  const set = (k: keyof MarketCondition) => (e: { target: { value: string } }) =>
    setC({ ...c, [k]: e.target.value })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="어떤 가게를 준비 중이세요?"
      description="입력한 조건으로 상권을 분석하고 필요한 지원금을 안내해요."
      className="max-w-[720px]"
    >
      <div className="grid grid-cols-3 gap-4">
        <Select
          label="업종 대분류"
          options={businessCodes.large}
          value={c.large}
          onChange={set('large')}
        />
        <Select
          label="업종 중분류"
          options={businessCodes.mid}
          value={c.mid}
          onChange={set('mid')}
        />
        <Select
          label="업종 소분류"
          options={businessCodes.small}
          value={c.small}
          onChange={set('small')}
        />
        <Select
          label="지역"
          options={businessCodes.regions}
          value={c.region}
          onChange={set('region')}
        />
        <Input label="규모" value={c.size} onChange={set('size')} />
        <Input label="예산" value={c.budget} onChange={set('budget')} />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => setC(defaultMarketCondition)}>
          초기화
        </Button>
        <Button onClick={() => onSubmit(c)}>상권 분석하기</Button>
      </div>
    </Modal>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="bg-border h-1.5 flex-1 rounded-full">
      <div
        className="bg-border-strong h-full rounded-full"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

/** 11-2. 상권 분석 결과 */
function Result({ a, onReset }: { a: MarketAnalysis; onReset: () => void }) {
  const navigate = useNavigate()
  const c = a.condition
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="typo-h3">
            {c.region} 산격동·{c.large} &gt; {c.mid} &gt; {c.small}
          </h2>
          <p className="typo-caption text-text-muted mt-1">반경 500m · 2026. 8 기준</p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          조건 재설정
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard value={`${a.sameCount}곳`} label="반경 500m 동종업종" />
        <StatCard value={a.footTraffic} label="일평균 유동인구" />
        <StatCard value={a.avgRent} label="평균 임대료 (월)" />
        <StatCard value={a.avgSales} label="동종 평균 매출 (월)" />
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="typo-h4">동종업종 밀집도 — 지역 평균 대비</p>
              <span className="border-border-strong typo-badge text-text-secondary inline-flex h-6 items-center rounded-full border px-3">
                평균보다 높음
              </span>
            </div>
            <div className="space-y-3">
              {[
                ['북구 평균', a.density.regionAvg],
                ['산격동', a.density.here],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-4">
                  <span className="typo-caption text-text-muted w-16">{k}</span>
                  <Bar value={v as number} max={30} />
                  <span className="typo-body2 w-10 text-right">{v}곳</span>
                </div>
              ))}
            </div>
            <p className="typo-caption text-text-muted">{a.density.comment}</p>
          </Card>

          <Card className="space-y-3 p-0">
            <p className="typo-h4 px-5 pt-5">주변 상권 비교</p>
            <table className="w-full text-left">
              <thead className="bg-surface-muted typo-caption text-text-muted">
                <tr>
                  {['행정동', '동종업종', '일 유동인구', '평균 임료', '평균 매출'].map((h) => (
                    <th key={h} className="px-5 py-2.5 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="typo-body2">
                {a.nearby.map((n) => (
                  <tr key={n.dong} className="border-border-subtle border-t">
                    <td className="px-5 py-3">{n.dong}</td>
                    <td className="px-5 py-3">{n.count}곳</td>
                    <td className="px-5 py-3">{n.traffic}</td>
                    <td className="px-5 py-3">{n.rent}</td>
                    <td className="typo-label-sm px-5 py-3">{n.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className="typo-h4">이 상권에서 창업한다면</p>
              <p className="typo-body2 text-text-secondary">
                임대료 {a.avgRent} 기준 손익분기 월 매출은 약 {a.breakEven} 원이에요.
              </p>
            </div>
            <Button onClick={() => navigate('/loans')}>예비창업자 대출 보기</Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="typo-h4">업종 구성 - 반경 500m</p>
            {a.composition.map((c2) => (
              <div key={c2.name} className="space-y-1">
                <div className="typo-body2 flex justify-between">
                  <span>{c2.name}</span>
                  <span className="text-text-secondary">
                    {c2.count}곳·{c2.ratio}%
                  </span>
                </div>
                <div className="bg-border h-1 w-1/2 rounded-full">
                  <div
                    className="bg-border-strong h-full rounded-full"
                    style={{ width: `${c2.ratio * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-2">
            <p className="typo-caption text-text-muted">월 매출 추정</p>
            <p className="font-heading text-[26px] font-semibold">{a.avgSales}</p>
            <p className="typo-caption text-text-muted">
              동종업종 평균·상위 25%는 3,800만 원
              <br />
              임대료 {a.avgRent} 기준 손익분기 {a.breakEven}
            </p>
          </Card>

          <Card className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/loans')}
              className="flex w-full items-start justify-between text-left"
            >
              <div>
                <p className="typo-caption text-text-muted">이 조건으로 받을 수 있는</p>
                <p className="typo-h4">예비창업자 대출 4건</p>
                <p className="typo-caption text-text-muted">예비창업대출</p>
              </div>
              <IconChevronRight size={16} className="text-text-muted mt-1" />
            </button>
            <div className="flex flex-wrap gap-1.5">
              <Tag>운전자금 3</Tag>
              <Tag>시설자금 1</Tag>
              <Tag>~ 11. 14 마감</Tag>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function MarketPage() {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null)
  const [open, setOpen] = useState(true)

  return (
    <>
      {analysis ? (
        <Result a={analysis} onReset={() => setOpen(true)} />
      ) : (
        <div className="space-y-5 opacity-40">
          <h2 className="typo-h1">어떤 가게를 준비 중이세요?</h2>
          <Card className="h-[200px]">
            <span className="sr-only">조건 입력 대기 중</span>
          </Card>
        </div>
      )}
      <ConditionModal
        open={open}
        initial={analysis?.condition ?? defaultMarketCondition}
        onClose={() => setOpen(false)}
        onSubmit={(c) => {
          setAnalysis({ ...mockMarketAnalysis, condition: c })
          setOpen(false)
        }}
      />
    </>
  )
}
