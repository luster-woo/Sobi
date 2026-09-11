import { useState } from 'react'
import { useSearchParams } from 'react-router'

import BusinessMixPanel from '@/features/market-analysis/components/BusinessMixPanel'
import DensityPanel from '@/features/market-analysis/components/DensityPanel'
import MarketConditionModal from '@/features/market-analysis/components/MarketConditionModal'
import MarketSummaryTiles from '@/features/market-analysis/components/MarketSummaryTiles'
import NeighborTable from '@/features/market-analysis/components/NeighborTable'
import RevenueEstimatePanel from '@/features/market-analysis/components/RevenueEstimatePanel'
import RevenueStructurePanel from '@/features/market-analysis/components/RevenueStructurePanel'
import SeoulRankPanel from '@/features/market-analysis/components/SeoulRankPanel'
import StoreChurnPanel from '@/features/market-analysis/components/StoreChurnPanel'
import { useMarketAnalysis } from '@/features/market-analysis/hooks/useMarketAnalysis'
import { readConditionFromParams } from '@/features/market-analysis/model/condition'
import { formatDataQuarter } from '@/features/market-analysis/model/format'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/** 표에 넣을 주변 상권 행 수와 업종 구성 항목 수. 화면에 노출하지 않는 고정값이다 */
const COMPARE_LIMIT = 7
const MIX_LIMIT = 6

/**
 * 상권 분석 (S15P21D101-182)
 *
 * 조건(행정동·업종)을 URL 쿼리스트링에 둔다. 분석 결과를 링크로 공유할 수 있어야 하고,
 * 조건 입력 모달이 생기면 모달은 navigate 만 하면 되기 때문이다. 상태로 들고 있으면
 * 새로고침하면 조건이 사라지고, 뒤로가기로 이전 조건에 돌아갈 수도 없다.
 *
 * 조건 입력 모달은 열려 있을 때만 마운트한다. 그래야 열 때마다 그 시점의 주소값으로
 * 초기화되고, 모달 안의 선택 상태를 바깥과 맞추는 동기화 코드가 필요 없다.
 */
export function MarketAnalysisPage() {
  const [searchParams] = useSearchParams()
  const [conditionOpen, setConditionOpen] = useState(false)
  const dongCode = searchParams.get('dongCode')
  const businessCode = searchParams.get('businessCode')

  // 둘 중 하나만 있으면 조회할 수 없다. 서버가 둘 다 필수로 받는다
  const params = dongCode && businessCode ? { dongCode, businessCode } : undefined

  const { data, isLoading, isError, error } = useMarketAnalysis(
    params && { ...params, compareLimit: COMPARE_LIMIT, mixLimit: MIX_LIMIT },
  )

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        {!params && (
          <>
            <EmptyState
              title="분석할 상권을 골라주세요"
              description="업종과 지역을 고르면 점포 수·유동인구·매출을 분석해드려요."
            />

            <Button className="mx-auto" onClick={() => setConditionOpen(true)}>
              상권 분석하기
            </Button>
          </>
        )}

        {isLoading && (
          <>
            <Skeleton variant="text" width={320} height={22} />
            <Skeleton height={78} className="rounded-md" />
          </>
        )}

        {isError && (
          <EmptyState
            title="상권 정보를 불러오지 못했어요"
            // 존재하지 않는 행정동(MARKET_001)과 그 외 오류를 구분해 보여준다
            description={
              error instanceof Error && error.message.includes('404')
                ? '선택한 지역의 상권 데이터가 없어요. 다른 행정동을 골라주세요.'
                : '잠시 후 다시 시도해주세요.'
            }
          />
        )}

        {data && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-text text-[15px] font-bold">
                  {data.location.cityName} {data.location.districtName} {data.location.dongName} ·{' '}
                  {data.business.name}
                </p>
                <p className="text-text-muted mt-1 text-[11.5px]">
                  행정동 기준 · {formatDataQuarter(data.meta.dataQuarter)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setConditionOpen(true)}
              >
                조건 재설정
              </Button>
            </div>

            {/* 시안의 .body — 본문과 292px 보조 열. lg 아래에서는 한 줄로 쌓인다 */}
            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_292px]">
              {/* min-w-0 이 없으면 6열 비교표가 보조 열을 밀어낸다 */}
              <div className="flex min-w-0 flex-col gap-3.5">
                <MarketSummaryTiles
                  location={data.location}
                  summary={data.summary}
                  storeChurn={data.storeChurn}
                />

                <DensityPanel
                  location={data.location}
                  density={data.density}
                  neighbors={data.neighbors}
                />

                <NeighborTable location={data.location} neighbors={data.neighbors} />

                <RevenueStructurePanel
                  summary={data.summary}
                  revenueStructure={data.revenueStructure}
                />
              </div>

              <div className="flex flex-col gap-3.5">
                <BusinessMixPanel business={data.business} businessMix={data.businessMix} />

                <RevenueEstimatePanel summary={data.summary} seoulRank={data.seoulRank} />

                <SeoulRankPanel
                  business={data.business}
                  summary={data.summary}
                  seoulRank={data.seoulRank}
                />

                <StoreChurnPanel business={data.business} storeChurn={data.storeChurn} />
              </div>
            </div>
          </>
        )}
      </div>

      {conditionOpen && (
        <MarketConditionModal
          onClose={() => setConditionOpen(false)}
          initial={readConditionFromParams(searchParams)}
        />
      )}
    </>
  )
}
