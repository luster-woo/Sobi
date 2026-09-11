import type { ReactNode } from 'react'

import Panel from '@/shared/ui/Panel'

interface MiniPanelProps {
  title: string
  /** 제목 오른쪽. 합계나 부가 숫자가 들어간다 */
  headerRight?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * 시안의 .panel.mini — 우측 열(292px)에 들어가는 작은 패널.
 *
 * 제목 줄이 있는 Panel 과 나눈 이유는 규격이 다르기 때문이다. Panel 은 제목 줄이 실선으로
 * 구분되고 본문 여백을 각 패널이 갖는데, mini 는 구분선이 없고 패널 자체가 여백을
 * 갖는다. 프롭 하나로 합치면 둘 중 어느 모양인지가 호출부에서 안 보인다.
 */
export default function MiniPanel({ title, headerRight, children, className }: MiniPanelProps) {
  return (
    <Panel className={className}>
      <div className="flex flex-col gap-2.5 px-[15px] py-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-text text-[13px] font-bold">{title}</h3>
          {headerRight}
        </div>

        {children}
      </div>
    </Panel>
  )
}
