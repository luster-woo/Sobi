import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { SUPPORT_STATUS, SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { SUPPORT_PROGRAM_TYPE } from '@/shared/types'
import FilterChip from '@/shared/ui/FilterChip'
import Select from '@/shared/ui/Select'

const TYPE_OPTIONS = [
  { value: '', label: '유형 전체' },
  ...Object.values(SUPPORT_PROGRAM_TYPE).map((type) => ({
    value: type,
    label: SUPPORT_PROGRAM_TYPE_LABEL[type],
  })),
]

/**
 * 판정 결과 세 가지만 고를 수 있다.
 *
 * ⚠️ `SUPPORT_STATUS` 를 그대로 펼치면 안 된다. 서버가 거를 때 쓰는 값은
 *    `SupportStatus.of(judgement, null)` 로 만들어지는데(`SupportServiceImpl`), 두 번째
 *    인자(최근 신청 상태)가 **항상 null 로 고정**이라 결과가 이 셋뿐이다. 신청 상태
 *    (PREPARING·SUBMITTED·REVIEWING·APPROVED·PAID)를 넣으면 400 도 아니고 **조용히
 *    0건**이 나와서, 사용자는 해당하는 공고가 없다고 오해한다.
 *
 *    대출 목록은 `LoanServiceImpl` 이 뱃지 값과 직접 비교해 7종이 다 걸린다 —
 *    두 도메인 동작이 다르니 이쪽 코드를 저쪽에 복사하지 말 것.
 */
const JUDGEMENT_VALUES = [
  SUPPORT_STATUS.ELIGIBLE,
  SUPPORT_STATUS.UNKNOWN,
  SUPPORT_STATUS.INELIGIBLE,
] as const

const JUDGEMENT_OPTIONS = [
  { value: '', label: '판정 전체' },
  ...JUDGEMENT_VALUES.map((status) => ({
    value: status,
    label: SUPPORT_STATUS_LABEL[status],
  })),
]

/**
 * 시도 16개. 서버가 이 표기로 거른다(program_condition.region_sido).
 *
 * 값은 business_info.region 의 CHECK 제약과 같다(V18 마이그레이션). 정식 명칭이 아니라
 * 약칭이라 '서울특별시' 로 보내면 하나도 걸러지지 않는다.
 *
 * ⚠️ 상권 분석의 지역 트리(/common/market/regions)와 다른 목록이다. 그쪽은 서울
 *    행정동까지 내려가고 이쪽은 전국 시도 단위다. 공유하지 말 것.
 */
const REGION_OPTIONS = [
  { value: '', label: '지역 전체' },
  { value: '서울', label: '서울' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '인천', label: '인천' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '세종', label: '세종' },
  { value: '경기', label: '경기' },
  { value: '강원', label: '강원' },
  { value: '충북', label: '충북' },
  { value: '충남', label: '충남' },
  { value: '전북', label: '전북' },
  // 전남광주통합특별시. 행정구역이 실제로 합쳐져 시도가 17 → 16 이 됐다 (V18)
  { value: '전남광주', label: '전남·광주' },
  { value: '경북', label: '경북' },
  { value: '경남', label: '경남' },
  { value: '제주', label: '제주' },
]

/** ⚠️ sort 값 형식이 명세에 없어 Spring 형식으로 가정했다 */
const SORT_OPTIONS = [
  { value: 'endDate,asc', label: '마감 임박순' },
  { value: 'maxBalance,desc', label: '지원 금액 높은 순' },
]

type FilterKey = 'type' | 'region' | 'judgement' | 'isBookmark' | 'sort'

interface SupportFilterBarProps {
  type: string
  region: string
  judgement: string
  isBookmark: boolean
  sort: string
  /** useListParams 의 setValues 를 그대로 넘긴다. page 리셋까지 그쪽이 처리한다 */
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void
}

export default function SupportFilterBar({
  type,
  region,
  judgement,
  isBookmark,
  sort,
  onChange,
}: SupportFilterBarProps) {
  return (
    <div className="border-border-subtle flex flex-wrap items-center gap-2 border-b px-4 py-3">
      <Select
        size="sm"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(event) => onChange({ type: event.target.value || null })}
        className="w-[120px]"
        aria-label="지원 유형"
      />

      <Select
        size="sm"
        options={REGION_OPTIONS}
        value={region}
        onChange={(event) => onChange({ region: event.target.value || null })}
        className="w-[180px]"
        aria-label="지역"
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
        label="관심 사업만"
        selected={isBookmark}
        onToggle={() => onChange({ isBookmark: isBookmark ? null : 'true' })}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="text-caption text-text-muted">정렬</span>
        <Select
          size="sm"
          options={SORT_OPTIONS}
          value={sort || 'endDate,asc'}
          onChange={(event) => onChange({ sort: event.target.value })}
          className="w-[148px]"
          aria-label="정렬 기준"
        />
      </div>
    </div>
  )
}
