import { LOAN_SORT } from '@/features/loan/model/types'
import { LOAN_STATUS,LOAN_STATUS_LABEL } from '@/shared/constants/productStatus'
import FilterChip from '@/shared/ui/FilterChip'
import Select from '@/shared/ui/Select'

/**
 * 정렬 기준.
 *
 * 서버 enum(LoanSortType)을 그대로 쓴다. 방향이 값에 박혀 있어(금리는 낮은 순,
 * 한도는 높은 순) '금리 높은 순' 같은 선택지가 아예 없다.
 */
const SORT_OPTIONS = [
  { value: LOAN_SORT.INTEREST_RATE, label: '금리 낮은 순' },
  { value: LOAN_SORT.MAX_BALANCE, label: '한도 높은 순' },
]

/** 판정 결과. 라벨은 대출 기준(PAID = 실행 완료) */
const STATUS_OPTIONS = [
  { value: '', label: '판정 전체' },
  ...Object.values(LOAN_STATUS).map((status) => ({
    value: status,
    label: LOAN_STATUS_LABEL[status],
  })),
]

/*
 * 취급 기관 필터가 없다. 상품 수가 수십 건이라 기관으로 좁힐 일이 드물고, 검색어가
 * 이미 상품명과 은행명을 함께 훑는다(LoanSearchCondition.keyword). 고를 수 있는 기관을
 * 프론트가 상수로 들고 있어야 했던 것도 이유다 — 은행 목록 API 가 없고 bank_name 이
 * 자유 문자열이라, 상수에 없는 기관의 상품은 영영 걸러낼 수 없었다.
 */
type FilterKey = 'status' | 'bookmarked' | 'sort'

interface LoanFilterBarProps {
  status: string
  bookmarked: boolean
  sort: string
  /** useListParams 의 setValues 를 그대로 넘긴다. page 리셋까지 그쪽이 처리한다 */
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void
}

export default function LoanFilterBar({
  status,
  bookmarked,
  sort,
  onChange,
}: LoanFilterBarProps) {
  return (
    <div className="border-border-subtle flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <Select
        size="sm"
        options={STATUS_OPTIONS}
        value={status}
        onChange={(event) => onChange({ status: event.target.value || null })}
        className="w-[124px]"
        aria-label="판정 결과"
      />
      <FilterChip
        label="관심 상품만"
        selected={bookmarked}
        onToggle={() => onChange({ bookmarked: bookmarked ? null : 'true' })}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="text-caption text-text-muted">정렬</span>
        <Select
          size="sm"
          options={SORT_OPTIONS}
          value={sort || LOAN_SORT.INTEREST_RATE}
          onChange={(event) => onChange({ sort: event.target.value })}
          className="w-[132px]"
          aria-label="정렬 기준"
        />
      </div>
    </div>
  )
}
