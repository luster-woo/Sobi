import type { SelectHTMLAttributes } from 'react'
import { IconChevronDown } from './Icon'
import { cn } from '@/shared/lib/format'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: string[]
  className?: string
}

export default function Select({ label, options, className = '', ...rest }: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <span className="typo-label-sm text-text">{label}</span>}
      <div className="relative">
        <select
          className="h-11 w-full appearance-none rounded-md border border-border-strong bg-surface px-3.5 pr-10 typo-body1 text-text focus:border-primary"
          {...rest}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
    </div>
  )
}
