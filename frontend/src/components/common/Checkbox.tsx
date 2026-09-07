import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/format'

import { IconCheck } from './Icon'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  className?: string
}

export default function Checkbox({ label, className = '', checked, ...rest }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <span className="relative inline-flex size-[18px] shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} {...rest} />
        <span className="border-border-strong bg-surface peer-checked:border-primary peer-checked:bg-primary absolute inset-0 rounded-[4px] border transition-colors peer-disabled:opacity-50" />
        <IconCheck
          size={14}
          className="absolute top-[2px] left-[2px] text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      {label && <span className="typo-body2 text-text">{label}</span>}
    </label>
  )
}
