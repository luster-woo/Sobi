import type { InputHTMLAttributes, ReactNode } from 'react'
import { IconCheck } from './Icon'
import { cn } from '@/shared/lib/format'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  className?: string
}

export default function Checkbox({ label, className = '', checked, ...rest }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <span className="relative inline-flex size-[18px] shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} {...rest} />
        <span className="absolute inset-0 rounded-[4px] border border-border-strong bg-surface transition-colors peer-checked:border-primary peer-checked:bg-primary peer-disabled:opacity-50" />
        <IconCheck
          size={14}
          className="absolute left-[2px] top-[2px] text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      {label && <span className="typo-body2 text-text">{label}</span>}
    </label>
  )
}
