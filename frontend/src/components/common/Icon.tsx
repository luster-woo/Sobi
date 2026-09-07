import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export function IconSearch(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconBell(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconBookmark({ filled = false, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...base(p)} strokeWidth={2.4}>
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  )
}

export function IconCheckCircle(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="10" />
      <path
        d="m7.5 12.5 3 3 6-6.5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <svg {...base(p)} strokeWidth={2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconAlert(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </svg>
  )
}

export function IconBank(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
    </svg>
  )
}

export function IconWon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 9l1.6 6L11 9l1 6 2.4-6M6.5 12h11" strokeWidth="1.4" />
    </svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
