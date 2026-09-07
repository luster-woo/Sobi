import type { ReactNode } from 'react'

interface OnboardingShellProps {
  title: string
  description: ReactNode
  children: ReactNode
  width?: number
}

/** 사업자 인증·휴대폰 인증·마이데이터 동의 화면의 공통 뼈대 (중앙 제목 + 폼) */
export default function OnboardingShell({ title, description, children, width = 540 }: OnboardingShellProps) {
  return (
    <div className="mx-auto pt-14" style={{ maxWidth: width }}>
      <div className="text-center">
        <h1 className="typo-h1">{title}</h1>
        <p className="mt-3 typo-body2 leading-relaxed text-text-secondary">{description}</p>
      </div>
      <div className="mt-8 space-y-4">{children}</div>
    </div>
  )
}
