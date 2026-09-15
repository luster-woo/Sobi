import { LOAN_STATUS_LABEL, PRODUCT_STATUS } from '@/shared/constants/productStatus'
import FilterChip from '@/shared/ui/FilterChip'
import Select from '@/shared/ui/Select'

/**
 * ⚠️ 은행 목록을 받을 API 가 없습니다. 명세에 /common/businessCode(업종)는 있는데
 *    은행은 없고, loan.bank_name 이 자유 문자열이라 테이블도 없습니다.
 *    API 가 생기면 이 상수를 지우고 조회로 바꿉니다.
 */
const BANK_OPTIONS = [
  { value: '', label: '취급 기관 전체' },
  { value: '싸피은행', label: '싸피은행' },
  { value: '기업은행', label: '기업은행' },
  { value: '대구은행', label: '대구은행' },
]

/**
 * 정렬 기준.
 *
 * 서버가 받는 LoanSortType 은 INTEREST_RATE · MAX_BALANCE 둘뿐이고 방향이 값에
 * 박혀 있다(금리는 낮은 순, 한도는 높은 순). 그래서 '금리 높은 순' 은 버렸다 —
 * 대출을 고를 때 금리가 높은 순서로 볼 이유가 없다.
 *
 * ⚠️ 값은 아직 Spring 형식이다. 서버 enum 으로 바꾸는 건 연동 티켓에서 한다.
 */
const SORT_OPTIONS = [
  { value: 'interestRate,asc', label: '금리 낮은 순' },
  { value: 'maxLoanBalance,desc', label: '한도 높은 순' },
]

/** judgement 는 status 6종 중 하나를 보낸다. 라벨은 대출 기준(APPROVED = 보유중) */
const JUDGEMENT_OPTIONS = [
  { value: '', label: '판정 전체' },
  ...Object.values(PRODUCT_STATUS).map((status) => ({
    value: status,
    label: LOAN_STATUS_LABEL[status],
  })),
]

type FilterKey = 'bankName' | 'judgement' | 'isBookmark' | 'sort'

interface LoanFilterBarProps {
  bankName: string
  judgement: string
  isBookmark: boolean
  sort: string
  /** useListParams 의 setValues 를 그대로 넘긴다. page 리셋까지 그쪽이 처리한다 */
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void
}

export default function LoanFilterBar({
  bankName,
  judgement,
  isBookmark,
  sort,
  onChange,
}: LoanFilterBarProps) {
  return (
    <div className="border-border-subtle flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <Select
        size="sm"
        options={BANK_OPTIONS}
        value={bankName}
        onChange={(event) => onChange({ bankName: event.target.value || null })}
        className="w-[148px]"
        aria-label="취급 기관"
      />

      <Select
        size="sm"
        options={JUDGEMENT_OPTIONS}
        value={judgement}
        onChange={(event) => onChange({ judgement: event.target.value || null })}
        className="w-[124px]"
        aria-label="판정 결과"
      />
      <FilterChip
        label="관심 상품만"
        selected={isBookmark}
        onToggle={() => onChange({ isBookmark: isBookmark ? null : 'true' })}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="text-caption text-text-muted">정렬</span>
        <Select
          size="sm"
          options={SORT_OPTIONS}
          value={sort || 'interestRate,asc'}
          onChange={(event) => onChange({ sort: event.target.value })}
          className="w-[132px]"
          aria-label="정렬 기준"
        />
      </div>
    </div>
  )
}
