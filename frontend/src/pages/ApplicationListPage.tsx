import { useState } from 'react'
import { useSearchParams } from 'react-router'

import ApplicationCard from '@/features/application/components/ApplicationCard'
import ApplicationProgressStepper from '@/features/application/components/ApplicationProgressStepper'
import ApplicationStatusTabs from '@/features/application/components/ApplicationStatusTabs'
import { useApplications } from '@/features/application/hooks/useApplication'
import type { ApplicationFilter } from '@/features/application/model/filter'
import { filterApplications, toApplicationFilter } from '@/features/application/model/filter'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/**
 * 신청 현황 (S15P21D101-202)
 *
 * 신청 한 건이 만들어진 뒤의 모든 상황을 모아 본다. 준비중(PREPARING)도 포함한다.
 *
 * 처음에는 제출 이후만 보여주고 준비중은 상품 목록에서 이어가게 했는데, 그러면
 * 서류를 올리다 중단한 신청서로 돌아갈 길이 없었다. 자금 조합이 한 번에 여러 건을
 * 만들기 시작하면 갈 곳 없는 신청서가 더 늘어난다.
 *
 * 준비중을 진행 중과 같은 탭에 두지 않은 이유는 사용자가 할 일이 달라서다.
 * 준비중은 내가 서류를 올려야 움직이고, 진행 중은 기관을 기다리는 것뿐이다.
 *
 * 진행 사항 스텝퍼는 174 에서 이 카드 안으로 들어온다.
 */
export function ApplicationListPage() {
  const { data: applications, isLoading, isError } = useApplications()

  /*
   * 탭을 주소에 둔다. 자금 조합으로 신청을 만들면 전부 준비 중이라 그 탭을 지목해서
   * 보내야 하는데, 컴포넌트 안의 상태로는 밖에서 가리킬 수가 없다.
   *
   * replace 로 바꾼다. 탭은 조회 조건이라 뒤로가기가 탭을 되돌리면, 들어올 때 지목된
   * 탭으로 돌아가려다 한 번 더 눌러야 화면을 벗어나게 된다.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = toApplicationFilter(searchParams.get('tab'))
  const setFilter = (next: ApplicationFilter) => setSearchParams({ tab: next }, { replace: true })
  /** 한 번에 하나만 펼친다. 여러 개가 열려 있으면 화면이 길어져 비교가 어렵다 */
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-40" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !applications) {
    return (
      <EmptyState title="신청 현황을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
    )
  }

  /* 탭과 같은 함수로 센다. 규칙이 갈라지면 머리말과 탭의 숫자가 어긋난다 */
  const preparing = filterApplications(applications, 'PREPARING').length
  const ongoing = filterApplications(applications, 'ONGOING').length
  const settled = filterApplications(applications, 'SETTLED').length
  const visible = filterApplications(applications, filter)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-body2 text-text-secondary">
          준비 중 {preparing}건 · 진행 중 {ongoing}건 · 완료 {settled}건
        </p>
        <h1 className="text-h2 text-text mt-1 font-bold">신청 현황</h1>
      </header>

      <ApplicationStatusTabs applications={applications} value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <EmptyState
          title="해당하는 신청이 없어요"
          description="대출이나 지원사업을 신청하면 여기에서 진행 상황을 볼 수 있어요."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((application) => (
            <ApplicationCard
              key={application.applicationId}
              application={application}
              expanded={expandedId === application.applicationId}
              onToggle={() =>
                setExpandedId((prev) =>
                  prev === application.applicationId ? null : application.applicationId,
                )
              }
            >
              <ApplicationProgressStepper application={application} />
            </ApplicationCard>
          ))}
        </div>
      )}
    </div>
  )
}
