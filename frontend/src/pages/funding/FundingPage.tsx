import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import { mockFundingMixes } from '@/mocks/funding.mock'
import { formatManWon } from '@/utils/format'

const man = (n: number) => `${(n / 10_000).toLocaleString('ko-KR')}만`

/** 15. 자금 조달 조합 */
export default function FundingPage() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('5,000만 원')
  const [first, ...rest] = mockFundingMixes

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-4">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border-border-strong typo-body1 h-11 w-[260px] rounded-md border px-3.5"
          aria-label="필요 금액"
        />
        <Button>조합 찾기</Button>
        <span className="bg-bg typo-body2 text-text-muted rounded-full px-4 py-2">
          정렬 <span className="text-text">이자 적은 순</span>
        </span>
      </Card>

      <Card className="grid grid-cols-[1fr_420px] gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="typo-h4">{first.title}</p>
            {first.badge && <Badge variant="solid">{first.badge}</Badge>}
          </div>
          <ul className="divide-border-subtle divide-y">
            {first.items.map((it, i) => (
              <li key={it.name} className="flex items-center justify-between py-2.5">
                <span className={i === 0 ? 'typo-h4' : 'typo-body1'}>
                  ({i + 1}) {it.name}
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="typo-h4 font-semibold">{formatManWon(it.amount)}</span>
                  <span className="typo-caption text-text-muted w-12 text-right">
                    {it.rate === null ? '무상' : `연 ${it.rate}%`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Card variant="flat" className="rounded-md p-4">
            {first.notes.map((n) => (
              <p key={n} className="typo-caption text-text-secondary">
                ·{n}
              </p>
            ))}
          </Card>
        </div>

        <div className="space-y-6 pt-1">
          <div className="grid grid-cols-4 gap-3">
            {[
              ['총 조달액', man(first.total)],
              ['평균 금리', `연 ${first.avgRate}%`],
              ['월 상환액', man(first.monthly)],
              ['총 이자', man(first.totalInterest)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="typo-caption text-text-muted">{k}</p>
                <p className="font-heading text-[20px] font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/loans/ln-1/apply')}>이 조합으로 진행</Button>
            <Button variant="outline" onClick={() => navigate('/loans')}>
              구성 상품 보기
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        {rest.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="typo-body2 text-text-secondary">{m.title}</p>
              <p className="typo-h4">
                {m.items
                  .map(
                    (it) =>
                      `${it.name.replace('소진공 ', '').replace('지역신보 ', '').replace(' 대출', '')} ${man(it.amount)}`,
                  )
                  .join(' + ')}
                {m.items.length === 1 && `·연 ${m.avgRate}%`}
              </p>
              <p className="typo-caption text-text-muted">{m.notes[0]}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => navigate('/loans/ln-1/apply')}
            >
              이 조합 선택
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <table className="w-full text-left">
          <thead className="typo-caption text-text-muted">
            <tr>
              {['조합', '구성', '총 조달액', '평균 금리', '월 상환액', '총 이자'].map((h) => (
                <th key={h} className="px-5 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="typo-body2">
            {mockFundingMixes.map((m, i) => (
              <tr key={m.id} className="border-border-subtle border-t">
                <td className="typo-label-sm px-5 py-3">조합 {i + 1}</td>
                <td className="typo-body1 px-5 py-3">{m.summary}</td>
                <td className="px-5 py-3">{formatManWon(m.total)}</td>
                <td className="px-5 py-3">연 {m.avgRate}%</td>
                <td className="px-5 py-3">{man(m.monthly)} 원</td>
                <td className="px-5 py-3">{man(m.totalInterest)} 원</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="typo-caption text-text-muted px-5 py-3">
          무상 지원금 포함 총 조달액 기준 ·36개월 원리금균등 단순 비교
        </p>
      </Card>
    </div>
  )
}
