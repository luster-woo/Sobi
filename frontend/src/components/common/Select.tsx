import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/utils/format'

import { IconChevronDown } from './Icon'

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
          className="border-border-strong bg-surface typo-body1 text-text focus:border-primary h-11 w-full appearance-none rounded-md border px-3.5 pr-10"
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
          className="text-text-muted pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
        />
      </div>
    </div>
  )
}
