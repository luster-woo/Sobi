import type { ReactNode } from 'react'

interface PanelHeadProps {
  title: string
  /** 제목 오른쪽. 배지·버튼·링크 */
  aside?: ReactNode
}

/** 패널 제목 줄 (시안의 .p-head). 아래 본문과 실선으로 나뉜다 */
export default function PanelHead({ title, aside }: PanelHeadProps) {
  return (
    <div className="border-border-subtle px-card flex items-center justify-between gap-3 border-b py-2.5">
      <h3 className="text-text text-body2 font-bold">{title}</h3>
      {aside}
    </div>
  )
}
