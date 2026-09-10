import type { ReactNode } from 'react'

import Panel from '@/shared/ui/Panel'

interface MarketPanelProps {
  title: string
  /** 제목 오른쪽. 배지나 부가 숫자가 들어간다 */
  headerRight?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * 시안의 .panel + .p-head — 제목 줄이 아래 실선으로 구분되는 흰 프레임.
 *
 * shared 의 Panel 은 프레임만 그린다(안쪽 여백을 주지 않는 게 의도다). 제목 줄 규격은
 * 상권 분석 화면 안에서 여러 번 반복되므로 여기서 한 번만 정한다. 다른 feature 도
 * 같은 머리를 쓰게 되면 그때 shared/ui 로 올린다.
 *
 * 본문 여백은 children 쪽에 두지 않고 각 패널이 갖는다. 표가 들어가는 패널은 여백이
 * 0 이어야 하고, 막대가 들어가는 패널은 여백이 필요해서 규격이 하나로 안 잡힌다.
 */
export default function MarketPanel({ title, headerRight, children, className }: MarketPanelProps) {
  return (
    <Panel className={className}>
      <div className="border-border-subtle flex items-baseline justify-between gap-3 border-b px-[15px] py-3">
        <h3 className="text-text text-[13.5px] font-bold">{title}</h3>
        {headerRight}
      </div>

      {children}
    </Panel>
  )
}
