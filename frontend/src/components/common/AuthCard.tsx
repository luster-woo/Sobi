import type { ReactNode } from 'react'

import { cn } from '@/utils/format'

interface AuthCardProps {
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/** 로그인·회원가입·비밀번호 변경의 중앙 흰 카드 */
export default function AuthCard({ title, children, footer, className = '' }: AuthCardProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[460px] pt-16', className)}>
      <div className="bg-surface shadow-card rounded-xl p-10">
        {title && <h1 className="typo-h2 mb-8">{title}</h1>}
        {children}
      </div>
      {footer && <div className="px-10 pt-4">{footer}</div>}
    </div>
  )
}

/** "또는" 구분선 */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-4">
      <span className="bg-border h-px flex-1" />
      <span className="typo-caption text-text-disabled">또는</span>
      <span className="bg-border h-px flex-1" />
    </div>
  )
}
