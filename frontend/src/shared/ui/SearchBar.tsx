import { type FormEvent, useState } from 'react'

import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import { cn } from '@/shared/utils/cn'

interface SearchBarProps {
  /** 확정된 검색어. URL 같은 바깥 상태에서 내려오는 값 */
  value: string
  /** 엔터·검색 버튼으로 제출했을 때. 검색어를 지우면 '' 로 호출된다 */
  onSubmit: (keyword: string) => void
  placeholder?: string
  /** 요청 중이면 버튼에 스피너. 자연어 검색은 수 초 걸린다 */
  isSearching?: boolean
  disabled?: boolean
  className?: string
}

/**
 * 목록 화면 검색 바.
 *
 * 타이핑할 때마다 검색하는 debounce 방식을 쓰지 않는다. 이유가 두 가지다.
 *  - 검색 상태를 URL 에 두므로, 글자마다 히스토리가 쌓여 뒤로가기가 망가진다
 *  - 지원사업은 자연어(RAG) 검색이라 글자마다 호출하면 비용·지연이 감당이 안 된다
 * 그래서 제출은 항상 명시적이다. 대출의 상품명·기관명 검색도 같은 방식으로 쓴다.
 *
 * 입력칸의 draft 와 확정값 value 를 분리한 이유: 타이핑 중인 글자로 요청이 나가면
 * 안 되고, 반대로 뒤로가기로 URL 이 바뀌면 입력칸이 따라와야 한다.
 */
export default function SearchBar({
  value,
  onSubmit,
  placeholder = '상품명 · 기관명 검색',
  isSearching = false,
  disabled = false,
  className,
}: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = draft.trim()
    // 같은 검색어면 요청도 히스토리도 늘리지 않는다
    if (keyword === value) return
    onSubmit(keyword)
  }

  const handleClear = () => {
    setDraft('')
    // 지우는 건 곧 검색 해제다. 검색 버튼을 한 번 더 누르게 하지 않는다.
    // 아직 제출 전이라면(value 가 빈 문자열) 요청을 만들 필요가 없다.
    if (value !== '') onSubmit('')
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('flex items-start gap-2', className)}>
      <Input
        /*
         * type="search" 를 쓰면 일부 브라우저가 자체 X 버튼을 그려서
         * rightSlot 의 X 와 두 개가 된다. text 로 둔다.
         */
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        className="flex-1"
        rightSlot={
          draft ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="검색어 지우기"
              className="hover:text-text flex items-center transition-colors"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
      />

      <Button type="submit" loading={isSearching} disabled={disabled}>
        검색
      </Button>
    </form>
  )
}