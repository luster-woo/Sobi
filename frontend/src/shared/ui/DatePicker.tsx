import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import Input from '@/shared/ui/Input'
import { cn } from '@/shared/utils/cn'
import { formatIsoDate } from '@/shared/utils/formatters'

/** 연도 화면에 한 번에 보여줄 개수. 월(12개)과 같은 격자를 쓰려고 12로 맞췄다 */
const YEARS_PER_PAGE = 12

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type View = 'year' | 'month' | 'day'

interface DateParts {
  year: number
  month: number
  day: number
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIso({ year, month, day }: DateParts) {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** 'YYYY-MM-DD' 만 받는다. 형식이 아니면 null — 입력 중인 값이 들어올 수 있다 */
function parseIso(value: string): DateParts | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!matched) return null

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])

  if (month < 1 || month > 12) return null
  if (day < 1 || day > new Date(year, month, 0).getDate()) return null

  return { year, month, day }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('size-3.5', direction === 'prev' && 'rotate-180')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

interface DatePickerProps {
  label?: string
  required?: boolean
  /** 'YYYY-MM-DD'. 사용자가 직접 타이핑하는 중에는 형식이 안 맞을 수 있다 */
  value: string
  onChange: (value: string) => void
  /** 이 날짜를 넘는 값은 고를 수 없다. 'YYYY-MM-DD'. 기본값은 오늘 */
  max?: string
  error?: string
  helperText?: string
  placeholder?: string
  className?: string
}

/**
 * 연 → 월 → 일 순으로 좁혀 고르는 날짜 선택기.
 *
 * 일 단위 달력부터 열지 않는 이유: 개업연월일·생년월일은 몇 년에서 수십 년 전이다.
 * 월 단위로만 넘기면 화살표를 수십 번 눌러야 한다.
 *
 * 직접 타이핑도 막지 않는다. 키보드가 빠른 사용자에게 달력만 강요하면 더 느리다 —
 * 입력칸은 그대로 두고 오른쪽 버튼으로 달력을 연다.
 *
 * 달력 안은 roving tabindex 다. 칸 하나만 Tab 순서에 두고 나머지는 방향키로 옮긴다 —
 * 모든 칸을 Tab 으로 지나가게 하면 31일짜리 달에서 Tab 을 31번 눌러야 한다.
 *
 * 라이브러리를 넣지 않았다. 쓰는 곳이 개업연월일·생년월일 두 군데뿐이고,
 * 범위 선택·다국어 같은 기능이 필요 없어서 의존성 값을 못 한다.
 */
export default function DatePicker({
  label,
  required,
  value,
  onChange,
  max,
  error,
  helperText,
  placeholder = 'YYYY-MM-DD',
  className,
}: DatePickerProps) {
  const inputId = useId()
  const dialogId = `${inputId}-dialog`

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  /** 다음 렌더에서 활성 칸으로 포커스를 옮길지. 열기·방향키·화면 전환에서만 켠다 */
  const shouldFocusCell = useRef(false)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('year')
  /** 방향키가 옮겨 다니는 칸. view 에 따라 연·월·일 값이다 */
  const [activeCell, setActiveCell] = useState(1)

  const today = useMemo(() => new Date(), [])
  const maxParts = useMemo(
    () =>
      parseIso(
        max ??
          toIso({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }),
      ),
    [max, today],
  )

  const selected = parseIso(value)

  /** 달력이 지금 보고 있는 지점. 선택값이 없으면 오늘 */
  const [cursor, setCursor] = useState({
    year: selected?.year ?? today.getFullYear(),
    month: selected?.month ?? today.getMonth() + 1,
  })

  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const yearPageStart = Math.floor(cursor.year / YEARS_PER_PAGE) * YEARS_PER_PAGE

  /* 바깥 클릭·ESC 로 닫는다. ESC 는 연 버튼으로 포커스를 되돌린다 */
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  /*
   * 활성 칸으로 포커스를 옮긴다. 의존성 배열이 없는 대신 플래그로 막는다 —
   * 이전/다음 화살표로 달을 넘길 때는 포커스가 그 버튼에 남아야 해서
   * cursor 변화만으로 포커스를 옮길 수 없다.
   */
  useEffect(() => {
    if (!open || !shouldFocusCell.current) return
    shouldFocusCell.current = false
    gridRef.current?.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus()
  })

  const openPicker = () => {
    const base = parseIso(value)
    const year = base?.year ?? today.getFullYear()
    const month = base?.month ?? today.getMonth() + 1

    setCursor({ year, month })
    // 값이 이미 있으면 그 달을 바로 보여준다. 처음 고를 때만 연도부터
    setView(base ? 'day' : 'year')
    setActiveCell(base ? base.day : year)
    shouldFocusCell.current = true
    setOpen(true)
  }

  const goToView = (next: View, active: number) => {
    setView(next)
    setActiveCell(active)
    shouldFocusCell.current = true
  }

  const isYearDisabled = (year: number) => (maxParts ? year > maxParts.year : false)

  const isMonthDisabled = (month: number) =>
    maxParts
      ? cursor.year > maxParts.year || (cursor.year === maxParts.year && month > maxParts.month)
      : false

  const isDayDisabled = (day: number) => {
    if (!maxParts) return false
    if (cursor.year !== maxParts.year || cursor.month !== maxParts.month) {
      return (
        cursor.year > maxParts.year ||
        (cursor.year === maxParts.year && cursor.month > maxParts.month)
      )
    }
    return day > maxParts.day
  }

  const pickDay = (day: number) => {
    onChange(toIso({ year: cursor.year, month: cursor.month, day }))
    setOpen(false)
    triggerRef.current?.focus()
  }

  /** 지금 화면에서 고를 수 있는 마지막 칸. 방향키가 비활성 칸에 멈추지 않게 한다 */
  const lastEnabled = (() => {
    if (view === 'year') return maxParts ? maxParts.year : yearPageStart + YEARS_PER_PAGE - 1
    if (view === 'month') return maxParts && cursor.year === maxParts.year ? maxParts.month : 12
    return maxParts && cursor.year === maxParts.year && cursor.month === maxParts.month
      ? Math.min(maxParts.day, daysInMonth)
      : daysInMonth
  })()

  const firstCell = view === 'year' ? yearPageStart : 1
  const activeValue = clamp(activeCell, firstCell, Math.max(lastEnabled, firstCell))

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const columns = view === 'day' ? 7 : 3

    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = activeValue - 1
        break
      case 'ArrowRight':
        next = activeValue + 1
        break
      case 'ArrowUp':
        next = activeValue - columns
        break
      case 'ArrowDown':
        next = activeValue + columns
        break
      case 'Home':
        next = firstCell
        break
      case 'End':
        next = lastEnabled
        break
      default:
        return
    }

    event.preventDefault()
    shouldFocusCell.current = true

    if (view === 'year') {
      // 연도는 페이지 경계를 넘어 계속 이동한다. cursor 를 따라 옮겨 페이지도 같이 넘긴다
      const year = clamp(next, 1900, maxParts ? maxParts.year : 9999)
      setActiveCell(year)
      setCursor((previous) => ({ ...previous, year }))
      return
    }

    setActiveCell(clamp(next, 1, lastEnabled))
  }

  const cellClass =
    'text-body2 flex h-9 items-center justify-center rounded-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35'

  const gridLabel =
    view === 'year'
      ? '연도 선택'
      : view === 'month'
        ? '월 선택'
        : `${cursor.year}년 ${cursor.month}월`

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      // Tab 으로 달력 밖으로 나가면 닫는다. relatedTarget 이 없으면(비포커스 영역 클릭) 둔다
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && !event.currentTarget.contains(next)) setOpen(false)
      }}
    >
      <Input
        id={inputId}
        label={label}
        required={required}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // 입력 중에 변환하면 커서가 튄다. 포커스가 빠질 때만 형식을 맞춘다
        onBlur={() => onChange(formatIsoDate(value))}
        error={error}
        helperText={helperText}
        rightSlot={
          <button
            ref={triggerRef}
            type="button"
            aria-label="달력 열기"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? dialogId : undefined}
            onClick={openPicker}
            className="text-text-muted hover:text-text transition-colors"
          >
            <CalendarIcon />
          </button>
        }
      />

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label="날짜 선택"
          className="border-border bg-surface shadow-dropdown absolute top-full right-0 z-30 mt-1.5 w-[268px] rounded-md border p-2.5"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <button
              type="button"
              aria-label="이전"
              onClick={() =>
                setCursor((previous) => {
                  if (view === 'year') return { ...previous, year: previous.year - YEARS_PER_PAGE }
                  if (view === 'month') return { ...previous, year: previous.year - 1 }
                  return previous.month === 1
                    ? { year: previous.year - 1, month: 12 }
                    : { ...previous, month: previous.month - 1 }
                })
              }
              className="text-text-muted hover:text-text hover:bg-surface-muted rounded-sm p-1.5 transition-colors"
            >
              <Chevron direction="prev" />
            </button>

            {/* 제목을 누르면 한 단계 위로 올라간다 — 일 → 월 → 연 */}
            <button
              type="button"
              onClick={() =>
                view === 'day' ? goToView('month', cursor.month) : goToView('year', cursor.year)
              }
              disabled={view === 'year'}
              className="font-heading text-body2 text-text hover:bg-surface-muted rounded-sm px-2 py-1 font-semibold tabular-nums transition-colors disabled:hover:bg-transparent"
            >
              {view === 'year' && `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`}
              {view === 'month' && `${cursor.year}년`}
              {view === 'day' && `${cursor.year}년 ${cursor.month}월`}
            </button>

            <button
              type="button"
              aria-label="다음"
              onClick={() =>
                setCursor((previous) => {
                  if (view === 'year') return { ...previous, year: previous.year + YEARS_PER_PAGE }
                  if (view === 'month') return { ...previous, year: previous.year + 1 }
                  return previous.month === 12
                    ? { year: previous.year + 1, month: 1 }
                    : { ...previous, month: previous.month + 1 }
                })
              }
              className="text-text-muted hover:text-text hover:bg-surface-muted rounded-sm p-1.5 transition-colors"
            >
              <Chevron direction="next" />
            </button>
          </div>

          <div ref={gridRef} role="group" aria-label={gridLabel} onKeyDown={handleGridKeyDown}>
            {view === 'year' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index).map(
                  (year) => (
                    <button
                      key={year}
                      type="button"
                      disabled={isYearDisabled(year)}
                      aria-pressed={selected?.year === year}
                      data-active={year === activeValue}
                      tabIndex={year === activeValue ? 0 : -1}
                      onClick={() => {
                        setCursor((previous) => ({ ...previous, year }))
                        goToView('month', selected?.year === year ? selected.month : 1)
                      }}
                      onFocus={() => setActiveCell(year)}
                      className={cn(
                        cellClass,
                        'tabular-nums',
                        selected?.year === year
                          ? 'bg-primary text-text-inverse font-medium'
                          : 'text-text hover:bg-surface-muted',
                      )}
                    >
                      {year}
                    </button>
                  ),
                )}
              </div>
            )}

            {view === 'month' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <button
                    key={month}
                    type="button"
                    disabled={isMonthDisabled(month)}
                    aria-label={`${cursor.year}년 ${month}월`}
                    aria-pressed={selected?.year === cursor.year && selected?.month === month}
                    data-active={month === activeValue}
                    tabIndex={month === activeValue ? 0 : -1}
                    onClick={() => {
                      setCursor((previous) => ({ ...previous, month }))
                      goToView(
                        'day',
                        selected?.year === cursor.year && selected?.month === month
                          ? selected.day
                          : 1,
                      )
                    }}
                    onFocus={() => setActiveCell(month)}
                    className={cn(
                      cellClass,
                      selected?.year === cursor.year && selected?.month === month
                        ? 'bg-primary text-text-inverse font-medium'
                        : 'text-text hover:bg-surface-muted',
                    )}
                  >
                    {month}월
                  </button>
                ))}
              </div>
            )}

            {view === 'day' && (
              <>
                {/* 각 날짜 버튼이 'N년 M월 D일' 을 통째로 읽으므로 머리글은 낭독에서 뺀다 */}
                <div aria-hidden="true" className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((weekday) => (
                    <span
                      key={weekday}
                      className="text-caption text-text-muted flex h-7 items-center justify-center"
                    >
                      {weekday}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* 1일이 시작하는 요일까지 빈 칸을 밀어둔다 */}
                  {Array.from({ length: new Date(cursor.year, cursor.month - 1, 1).getDay() }).map(
                    (_, index) => (
                      <span key={`blank-${index}`} />
                    ),
                  )}

                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                    const isSelected =
                      selected?.year === cursor.year &&
                      selected?.month === cursor.month &&
                      selected?.day === day

                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={isDayDisabled(day)}
                        aria-label={`${cursor.year}년 ${cursor.month}월 ${day}일`}
                        aria-pressed={isSelected}
                        data-active={day === activeValue}
                        tabIndex={day === activeValue ? 0 : -1}
                        onClick={() => pickDay(day)}
                        onFocus={() => setActiveCell(day)}
                        className={cn(
                          cellClass,
                          'tabular-nums',
                          isSelected
                            ? 'bg-primary text-text-inverse font-medium'
                            : 'text-text hover:bg-surface-muted',
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
