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

/** ⚠️ sort 값 형식이 명세에 없어 Spring 형식으로 가정했습니다 */
const SORT_OPTIONS = [
  { value: 'interestRate,asc', label: '금리 낮은 순' },
  { value: 'interestRate,desc', label: '금리 높은 순' },
  { value: 'maxLoanBalance,desc', label: '한도 높은 순' },
]

type FilterKey = 'bankName' | 'isPossible' | 'isBookmark' | 'sort'

interface LoanFilterBarProps {
  bankName: string
  isPossible: boolean
  isBookmark: boolean
  sort: string
  /** useListParams 의 setValues 를 그대로 넘긴다. page 리셋까지 그쪽이 처리한다 */
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void
}

export default function LoanFilterBar({
  bankName,
  isPossible,
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

      {/*
       * ⚠️ 이 토글은 임시다. '신청 상태' 아코디언 필터로 교체될 예정이다.
       *
       * 지금 API 파라미터가 isPossible(boolean) 하나뿐이라 "신청 가능만" 켜고 끄는 것밖에
       * 못 한다. 백엔드가 컬럼을 enum 으로 바꾸면 6상태(가능 / 불가 / 작성 중 / 신청 완료 /
       * 검토 중 / 보유중) 중에서 고르는 아코디언으로 바꾼다.
       *
       * 그때 할 일:
       *   - 라벨은 LOAN_STATUS_LABEL 을 그대로 쓴다 (이미 6개가 정의돼 있다)
       *   - 파라미터 이름이 정해지면 LoanListParams 의 isPossible 을 그것으로 교체
       *   - 칩 자리에 아코디언을 넣는다. URL 키도 isPossible → status 로 바뀐다
       *
       * 지금 6상태 UI 를 먼저 만들면 골라도 서버에 보낼 파라미터가 없다.
       */}
      <FilterChip
        label="신청 가능만"
        selected={isPossible}
        onToggle={() => onChange({ isPossible: isPossible ? null : 'true' })}
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
