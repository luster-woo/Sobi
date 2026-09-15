import type { ApplicationFilter } from '@/features/application/model/filter'
import { filterApplications } from '@/features/application/model/filter'
import type { ApplicationListItem } from '@/features/application/model/types'
import { cn } from '@/shared/utils/cn'

interface ApplicationStatusTabsProps {
  applications: ApplicationListItem[]
  value: ApplicationFilter
  onChange: (value: ApplicationFilter) => void
}

const TABS: ReadonlyArray<{ value: ApplicationFilter; label: string }> = [
  { value: 'PREPARING', label: '준비 중' },
  { value: 'ONGOING', label: '진행 중' },
  { value: 'SETTLED', label: '완료' },
  { value: 'ALL', label: '전체' },
]

/**
 * 상태 탭. 개수를 같이 보여준다.
 *
 * 서버에 필터를 넘기지 않는다. 신청 건수가 많아야 수십 건이고, 탭을 누를 때마다
 * 왕복하면 개수가 깜빡인다.
 *
 * role·aria 는 상환 관리의 LoanProductTabs 와 맞췄다. 같은 성격의 탭인데 한쪽만
 * 스크린리더가 탭으로 읽으면 안 된다.
 */
export default function ApplicationStatusTabs({
  applications,
  value,
  onChange,
}: ApplicationStatusTabsProps) {
  return (
    <div role="tablist" aria-label="신청 상태" className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const count = filterApplications(applications, tab.value).length
        const active = tab.value === value

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'text-body2 focus-visible:outline-primary h-9 rounded-sm border px-3.5 font-semibold transition-colors focus-visible:outline focus-visible:-outline-offset-2',
              // 둘 다 테두리를 그려야 탭을 바꿀 때 너비가 흔들리지 않는다
              active
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-muted',
            )}
          >
            {tab.label} {count}
          </button>
        )
      })}
    </div>
  )
}
