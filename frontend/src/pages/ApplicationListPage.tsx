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
import { cn } from '@/shared/utils/cn'

/**
 * 본문 폭.
 *
 * 목록 화면(대출·지원사업·관심 목록·계좌)이 전부 1120px 로 묶여 있다. 여기만 상한이
 * 없어서 넓은 모니터에서 카드가 화면 끝까지 늘어났다 — 메뉴를 옮길 때마다 본문 폭이
 * 달라져 화면이 흔들려 보인다.
 *
 * 상한이 없는 대시보드·마이페이지와는 경우가 다르다. 그쪽은 2열 그리드라 폭을
 * 나눠 쓰지만, 이 화면은 카드 한 줄이 그대로 늘어난다.
 *
 * 세 상태(로딩·오류·목록)에 모두 붙인다. 목록에만 주면 로딩 중에는 넓다가 데이터가
 * 오는 순간 폭이 줄어 한 번 덜컹거린다.
 */
const PAGE_WIDTH = 'mx-auto flex w-full max-w-[1120px] flex-col'

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
      <div className={cn(PAGE_WIDTH, 'gap-4')}>
        <Skeleton className="h-9 w-40" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !applications) {
    return (
      <div className={PAGE_WIDTH}>
        <EmptyState
          title="신청 현황을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
    )
  }

  const visible = filterApplications(applications, filter)

  return (
    <div className={cn(PAGE_WIDTH, 'gap-5')}>
      {/* 건수 요약을 제목 위에 따로 두지 않는다. 바로 아래 탭이 같은 숫자를 이미 말한다 */}
      <h1 className="text-h1">신청 현황</h1>

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
