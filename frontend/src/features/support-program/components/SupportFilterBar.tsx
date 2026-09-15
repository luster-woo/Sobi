import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { PRODUCT_STATUS, SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
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

/** judgement 는 status 7종 중 하나를 보낸다 */
const JUDGEMENT_OPTIONS = [
  { value: '', label: '판정 전체' },
  ...Object.values(PRODUCT_STATUS).map((status) => ({
    value: status,
    label: SUPPORT_STATUS_LABEL[status],
  })),
]

/**
 * ⚠️ 소관기관 목록을 받을 API 가 없다. 대출의 은행 목록과 같은 문제다.
 *    API 가 생기면 이 상수를 지우고 조회로 바꾼다. 여기 없는 기관의 공고는
 *    필터로 도달할 수 없고, 문자열이 한 글자만 달라도 결과가 0건으로 나온다.
 */
const INSTITUTION_OPTIONS = [
  { value: '', label: '소관 기관 전체' },
  { value: '중소벤처기업진흥공단', label: '중소벤처기업진흥공단' },
  { value: '소상공인시장진흥공단', label: '소상공인시장진흥공단' },
  { value: '고용노동부', label: '고용노동부' },
  { value: '대구광역시', label: '대구광역시' },
  { value: '국가상공회의소', label: '국가상공회의소' },
]

/** ⚠️ sort 값 형식이 명세에 없어 Spring 형식으로 가정했다 */
const SORT_OPTIONS = [
  { value: 'endDate,asc', label: '마감 임박순' },
  { value: 'maxBalance,desc', label: '지원 금액 높은 순' },
]

type FilterKey = 'type' | 'jrsdInsttNm' | 'judgement' | 'isBookmark' | 'sort'

interface SupportFilterBarProps {
  type: string
  jrsdInsttNm: string
  judgement: string
  isBookmark: boolean
  sort: string
  /** useListParams 의 setValues 를 그대로 넘긴다. page 리셋까지 그쪽이 처리한다 */
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void
}

export default function SupportFilterBar({
  type,
  jrsdInsttNm,
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
        options={INSTITUTION_OPTIONS}
        value={jrsdInsttNm}
        onChange={(event) => onChange({ jrsdInsttNm: event.target.value || null })}
        className="w-[180px]"
        aria-label="소관 기관"
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
