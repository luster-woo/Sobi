import { type CSSProperties, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

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
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import ColumnResizer from '@/shared/ui/ColumnResizer'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/** 표에 넣을 주변 상권 행 수와 업종 구성 항목 수. 화면에 노출하지 않는 고정값이다 */
const COMPARE_LIMIT = 7
const MIX_LIMIT = 6

/*
 * 보조 열 너비(px). 시안값이 292 인데, 업종 구성의 '부동산중개업' 같은 긴 이름이
 * 잘려서 손잡이로 늘릴 수 있게 했다.
 *
 * 최대값은 재지 않고 상수로 둔다. lg(1024px)에서 본문에 최소 560px 은 남겨야
 * 주변 상권 비교표 여섯 열이 가로 스크롤 없이 들어간다.
 */
const ASIDE_WIDTH = 292
const ASIDE_WIDTH_MIN = 250
const ASIDE_WIDTH_MAX = 400
/** 두 열 사이 간격. gap-3.5 와 같아야 손잡이가 경계 한가운데 선다 */
const COLUMN_GAP = 14

/**
 * 상권 분석 (S15P21D101-182)
 *
 * 조건(행정동·업종)을 URL 쿼리스트링에 둔다. 분석 결과를 링크로 공유할 수 있어야 하고,
 * 조건 입력 모달이 생기면 모달은 navigate 만 하면 되기 때문이다. 상태로 들고 있으면
 * 새로고침하면 조건이 사라지고, 뒤로가기로 이전 조건에 돌아갈 수도 없다.
 *
 * 조건 입력 모달은 열려 있을 때만 마운트한다. 그래야 열 때마다 그 시점의 주소값으로
 * 초기화되고, 모달 안의 선택 상태를 바깥과 맞추는 동기화 코드가 필요 없다.
 *
 * 조건 없이 들어오면 모달을 바로 연다. 사이드바로 진입한 사람은 아직 아무것도 고르지
 * 않은 상태라, 빈 화면을 보여주고 버튼을 한 번 더 누르게 할 이유가 없다.
 * 그 모달을 닫으면 이전 화면으로 돌려보낸다 — 남을 내용이 없는 화면이기 때문이다.
 */
export function MarketAnalysisPage() {
  const [searchParams] = useSearchParams()
  const [asideWidth, setAsideWidth] = useState(ASIDE_WIDTH)
  const navigate = useNavigate()
  const location = useLocation()
  const dongCode = searchParams.get('dongCode')
  const businessCode = searchParams.get('businessCode')

  // 둘 중 하나만 있으면 조회할 수 없다. 서버가 둘 다 필수로 받는다
  const params = dongCode && businessCode ? { dongCode, businessCode } : undefined

  const [conditionOpen, setConditionOpen] = useState(!params)

  /*
   * 결과를 보던 중 사이드바 '상권 분석' 을 누르면 같은 경로라 컴포넌트가 새로 만들어지지
   * 않는다. 주소에서 조건만 사라지므로, 그 변화를 보고 모달을 다시 연다.
   * effect 로 하면 빈 화면이 한 프레임 지나가고 set-state-in-effect 규칙에도 걸린다.
   */
  const [lastHasParams, setLastHasParams] = useState(Boolean(params))
  if (Boolean(params) !== lastHasParams) {
    setLastHasParams(Boolean(params))
    if (!params) setConditionOpen(true)
  }

  const { data, isLoading, isError, error } = useMarketAnalysis(
    params && { ...params, compareLimit: COMPARE_LIMIT, mixLimit: MIX_LIMIT },
  )

  /**
   * 모달을 닫을 때.
   *
   * 조건이 있으면(결과를 보다 '조건 재설정' 으로 연 경우) 그냥 닫는다. 뒤로 가면
   * 방금 보던 결과에서 벗어나 버린다.
   *
   * 조건이 없으면(사이드바로 갓 들어온 경우) 이전 화면으로 돌려보낸다. 닫고 남는 것이
   * 빈 화면뿐이라 사용자를 거기 세워둘 이유가 없다.
   *
   * location.key 가 'default' 면 이 세션의 첫 화면이라 뒤로 갈 곳이 없다(주소를 직접
   * 치고 들어온 경우). 그때는 대시보드로 보낸다.
   */
  const handleConditionClose = () => {
    setConditionOpen(false)
    if (params) return

    if (location.key === 'default') navigate(ROUTES.DASHBOARD)
    else navigate(-1)
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        {/*
          조건이 없을 때 모달 뒤에 깔리는 배경. 모달을 닫으면 화면을 떠나므로 이 상태로
          머무를 일은 없고, 오버레이 뒤가 텅 비어 보이지 않게 두는 것이다.
        */}
        {!params && (
          <EmptyState
            title="분석할 상권을 골라주세요"
            description="업종과 지역을 고르면 점포 수·유동인구·매출을 분석해드려요."
          />
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

            {/*
              시안의 .body — 본문과 보조 열. lg 아래에서는 한 줄로 쌓인다.

              너비를 style 로 바로 주지 않고 CSS 변수를 거치는 이유는 lg 아래 때문이다.
              인라인 스타일은 미디어쿼리를 타지 않아서, grid-template-columns 를 직접
              넣으면 한 줄로 쌓여야 할 좁은 화면에서도 두 열이 그대로 남는다.
            */}
            <div
              className="relative grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_var(--aside-width)]"
              style={{ '--aside-width': `${asideWidth}px` } as CSSProperties}
            >
              {/* 한 줄로 쌓이는 화면에는 경계가 없어서 손잡이도 없앤다 */}
              <ColumnResizer
                width={asideWidth}
                onChange={setAsideWidth}
                min={ASIDE_WIDTH_MIN}
                max={ASIDE_WIDTH_MAX}
                gap={COLUMN_GAP}
                anchor="right"
                label="보조 열 너비"
                className="max-lg:hidden"
              />

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
          onClose={handleConditionClose}
          onSubmitted={() => setConditionOpen(false)}
          initial={readConditionFromParams(searchParams)}
        />
      )}
    </>
  )
}
