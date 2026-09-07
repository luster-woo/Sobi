import type { FormEvent } from 'react'
import { IconSearch } from './Icon'
import Button from './Button'

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
      className="flex h-14 items-center gap-3 rounded-lg border border-border bg-surface pl-5 pr-2 shadow-card"
    >
      <IconSearch size={18} className="shrink-0 text-text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent typo-body1 text-text outline-none placeholder:text-text-disabled"
      />
      <Button type="submit" size="sm" className="rounded-full px-5">
        검색
      </Button>
    </form>
  )
}
