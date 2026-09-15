import { useState } from 'react'

import ApplicationCard from '@/features/application/components/ApplicationCard'
import ApplicationStatusTabs from '@/features/application/components/ApplicationStatusTabs'
import { useApplications } from '@/features/application/hooks/useApplication'
import type { ApplicationFilter } from '@/features/application/model/filter'
import { filterApplications } from '@/features/application/model/filter'
import { isSettled } from '@/features/application/model/statusLabel'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/**
 * 신청 현황 (S15P21D101-202)
 *
 * 신청·서류 제출 이후의 진행 상황을 모아 본다. 준비중(PREPARING)인 건은 서버가
 * 빼고 준다 — 아직 제출하지 않은 것은 현황이 아니고, 상품 목록에서 이어서 들어간다.
 *
 * 진행 사항 스텝퍼는 174 에서 이 카드 안으로 들어온다.
 */
export function ApplicationListPage() {
  const { data: applications, isLoading, isError } = useApplications()
  const [filter, setFilter] = useState<ApplicationFilter>('ONGOING')
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

  const ongoing = applications.filter((item) => !isSettled(item.status)).length
  const settled = applications.length - ongoing
  const visible = filterApplications(applications, filter)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-body2 text-text-secondary">
          진행 중 {ongoing}건 · 완료 {settled}건
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
              {/* 174 에서 스텝퍼가 들어온다 */}
              <p className="text-body2 text-text-secondary">진행 사항은 준비 중이에요.</p>
            </ApplicationCard>
          ))}
        </div>
      )}
    </div>
  )
}
