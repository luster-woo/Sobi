import type { FormEvent } from 'react'

import Button from './Button'
import { IconSearch } from './Icon'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, onSubmit, placeholder }: SearchBarProps) {
  const handle = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }
  return (
    <form
      onSubmit={handle}
      className="border-border bg-surface shadow-card flex h-14 items-center gap-3 rounded-lg border pr-2 pl-5"
    >
      <IconSearch size={18} className="text-text-muted shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="typo-body1 text-text placeholder:text-text-disabled min-w-0 flex-1 bg-transparent outline-none"
      />
      <Button type="submit" size="sm" className="rounded-full px-5">
        검색
      </Button>
    </form>
  )
}
