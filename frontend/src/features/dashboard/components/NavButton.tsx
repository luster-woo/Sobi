import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/utils/cn'

type Variant = 'primary' | 'outline'
/** 시안 앱 셸의 .btn 36px · .btn-sm 30px */
type Size = 'md' | 'sm'

interface NavButtonProps {
  to: string
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover active:bg-primary-active',
  outline: 'border-border-strong bg-surface text-text hover:bg-surface-muted border',
}

const sizeClass: Record<Size, string> = {
  md: 'h-9 px-3.5',
  sm: 'h-[30px] px-3',
}

/**
 * 버튼처럼 보이는 링크.
 *
 * shared/ui/Button 은 `<button>` 만 그려서 to 를 받을 수 없다. 대시보드의 CTA 는 전부
 * 화면 이동인데 `<button onClick={navigate}>` 로 두면 새 탭·가운데 클릭이 막히고
 * 보조기기에도 버튼으로 읽힌다. 그래서 여기서는 링크로 그린다.
 *
 * Button 에 asChild 를 더하는 편이 맞지만 shared/ui 를 고치면 이미 쓰는 화면 전부가
 * 영향을 받는다. 클래스가 Button 과 겹치는 것을 알면서 대시보드 안에만 둔 이유다.
 *
 * ⚠️ 세 번째 화면에서 또 필요해지면 shared/ui/Button 에 to 를 더하고 이 파일을 지운다.
 */
export default function NavButton({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className,
}: NavButtonProps) {
  return (
    <Link
      to={to}
      className={cn(
        'font-heading text-body2 inline-flex items-center justify-center rounded-sm font-medium transition-colors',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
    >
      {children}
    </Link>
  )
}
