/** 30000000 → "30,000,000 원" */
export function formatWon(n: number) {
  return `${n.toLocaleString('ko-KR')} 원`
}

/** 70_000_000 → "7,000만 원", 100_000_000 → "1억 원", 120_000_000 → "1억 2,000만 원" */
export function formatManWon(n: number) {
  const eok = Math.floor(n / 100_000_000)
  const man = Math.floor((n % 100_000_000) / 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  if (parts.length === 0) return formatWon(n)
  return `${parts.join(' ')} 원`
}

/** "2026-09-15" → "2026. 9. 15" */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}. ${m}. ${d}`
}

/** "2026-09-15" → "9. 15" */
export function formatMonthDay(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}. ${d}`
}

/** 마감일까지 남은 일수 (목업: 기준일 2026-09-02 고정) */
export function dday(iso: string, base = '2026-09-02') {
  const diff = (new Date(iso).getTime() - new Date(base).getTime()) / 86_400_000
  return Math.round(diff)
}

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}
