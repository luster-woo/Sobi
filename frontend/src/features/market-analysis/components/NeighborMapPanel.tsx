import { useMemo } from 'react'

import { useDongBoundaries } from '@/features/market-analysis/hooks/useDongBoundaries'
import { useMapZoom } from '@/features/market-analysis/hooks/useMapZoom'
import {
  HEAT_FILL,
  HEAT_METRIC,
  HEAT_METRIC_SPEC,
  heatHaloClass,
  type HeatMetric,
  heatTextClass,
  toHeatStep,
} from '@/features/market-analysis/model/heatMetric'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  projectDongs,
} from '@/features/market-analysis/model/projection'
import type { MarketLocation, NeighborMarket } from '@/features/market-analysis/model/types'
import { ZoomResetIcon } from '@/shared/ui/icons'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

interface NeighborMapPanelProps {
  location: MarketLocation
  /** 고른 지표 기준 상위 동들. 색칠과 이름표는 이 목록에만 붙는다 */
  neighbors: NeighborMarket[]
  /** 어떤 지표로 볼지. 비교표와 맞춰야 해서 페이지가 들고 있다 */
  metric: HeatMetric
  onMetricChange: (metric: HeatMetric) => void
  /** 지도에서 다른 동을 고르면. 업종은 그대로 두고 동만 바꾼다 */
  onSelectDong: (dongCode: string) => void
}

const METRICS: readonly HeatMetric[] = [
  HEAT_METRIC.STORE,
  HEAT_METRIC.TRAFFIC,
  HEAT_METRIC.REVENUE,
  HEAT_METRIC.CLOSE,
]

/** 값이 없는 동을 칠할 빗금. 0 으로 칠하면 '가장 적은 동' 으로 읽힌다 */
const HATCH_ID = 'neighbor-map-hatch'

/** 이름표 둘레에 두르는 테두리 두께. 글자가 남의 칸 위로 넘어가도 읽히게 한다 */
const LABEL_HALO_WIDTH = 3

/* 이름표 글자 크기와 값이 놓일 아래쪽 간격 */
const LABEL_FONT_SIZE = 11
const VALUE_FONT_SIZE = 10
const VALUE_OFFSET = 13

/**
 * 이름표를 그리려면 동이 화면에서 이만큼은 돼야 한다.
 *
 * 확대 배율을 곱한 폭으로 잰다. 기본 배율에서 가려진 동도 확대하면 이름이 드러나므로,
 * 지도를 키우는 일이 곧 '작은 동을 읽는' 방법이 된다.
 */
const MIN_LABEL_ROOM = 42
const MIN_VALUE_ROOM = 58

/**
 * 주변 상권 지도.
 *
 * 조회한 동과 이웃들을 실제 행정동 경계 위에 그리고, 고른 지표의 크기를 초록 농도로
 * 칠한다. 기존 패널들이 숫자로 말하던 것을 위치와 함께 보여주는 자리다 — 표에서
 * '공덕동 224곳' 을 읽는 것과 '동쪽이 비어 있다' 를 보는 것은 다른 정보다.
 *
 * 색은 초록 한 줄기만 쓴다. 지표마다 다른 색을 쓰면 범례를 네 벌 설명해야 하고,
 * 초록·빨강을 섞으면 '폐업률이 낮아서 진한 건지 높아서 진한 건지' 를 매번 다시
 * 확인하게 된다. 크기는 농도가, 좋고 나쁨은 글자가 맡는다.
 *
 * 자치구 전체를 그린다. 서버가 주는 neighbors 는 같은 자치구에서 점포 수 상위 일곱
 * 곳뿐이라(MarketServiceImpl 의 DEFAULT_COMPARE_LIMIT), 그것만 그리면 사이에 낀 동들이
 * 구멍으로 남아 섬 몇 개가 떠 있는 그림이 된다.
 *
 * 비교 대상이 아닌 동도 누를 수 있다. 그 동에 이 업종 점포가 없으면 서버가
 * 404(MARKET_001)를 주는데, 페이지가 '선택한 지역의 상권 데이터가 없어요' 로 받아주므로
 * 막다른 길이 되지 않는다. 누를 수 있는 곳을 일곱 개로 줄이는 손해가 더 크다.
 *
 * 경계 파일을 못 받으면 이 패널만 빠진다. 450KB 짜리 정적 파일 하나 때문에 상권
 * 분석 전체가 안 보이면 안 된다.
 */
export default function NeighborMapPanel({
  location,
  neighbors,
  metric,
  onMetricChange,
  onSelectDong,
}: NeighborMapPanelProps) {
  const { data: boundaries, isLoading, isError } = useDongBoundaries()

  /*
   * 확대·축소. 훅은 조건보다 먼저 불러야 한다 — 경계를 못 받은 상권에서 일찍 return 하면
   * 훅 개수가 달라져 React 가 상태를 잘못 짚는다.
   *
   * 크기는 투영이 쓰는 기준값과 같아야 한다. projection 을 기다리지 않는 이유는 그 값이
   * 상권과 무관한 상수이기 때문이다(VIEW_WIDTH · VIEW_HEIGHT).
   */
  const { svgRef, viewBox, zoom, zoomed, dragging, wasDragged, reset, handlers } = useMapZoom({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  })

  /*
   * 그릴 동 = 조회한 자치구의 모든 동 + 비교 대상.
   *
   * 427개를 훑으므로 자치구가 바뀔 때만 다시 센다. 지표 토글은 이 목록을 바꾸지 않는데
   * 매번 다시 돌면 누를 때마다 427번을 헛도는 셈이다.
   *
   * 비교 대상을 따로 합치는 이유는 서버가 자치구 경계를 넘는 동을 줄 수도 있어서다.
   * 지금은 같은 구 안에서만 고르지만, 그 규칙이 바뀌어도 화면에서 동이 사라지지 않는다.
   */
  const dongCodes = useMemo(() => {
    const codes = new Set<string>()

    if (boundaries) {
      for (const feature of boundaries.values()) {
        if (feature.properties.districtName === location.districtName) {
          codes.add(feature.properties.dongCode)
        }
      }
    }

    for (const neighbor of neighbors) codes.add(neighbor.dongCode)

    return [...codes]
  }, [boundaries, location.districtName, neighbors])

  if (isLoading) {
    return <Skeleton height={300} className="rounded-md" />
  }

  if (isError || !boundaries) return null

  const projection = projectDongs(dongCodes, boundaries)

  if (!projection) return null

  const spec = HEAT_METRIC_SPEC[metric]
  const byCode = new Map(neighbors.map((neighbor) => [neighbor.dongCode, neighbor]))

  /* 값이 있는 동끼리만 견준다. null 을 0 으로 세면 나머지 동들이 전부 진해진다 */
  const values = neighbors
    .map((neighbor) => spec.pick(neighbor))
    .filter((value): value is number => value !== null)

  /** 비교 대상 중 경계를 못 찾은 동. 행정동이 개편되면 생긴다 */
  const missingCount = neighbors.filter((neighbor) => !boundaries.has(neighbor.dongCode)).length

  /** 조회한 동. 테두리를 맨 위에 다시 그리려고 따로 꺼낸다 */
  const currentDong = projection.dongs.find((dong) => dong.dongCode === location.dongCode)

  /** 그 동의 색 단계. 비교 대상이 아니거나 값이 없으면 null */
  const stepOf = (dongCode: string): number | null => {
    const neighbor = byCode.get(dongCode)
    if (!neighbor) return null

    const value = spec.pick(neighbor)
    return value === null ? null : toHeatStep(value, values)
  }

  return (
    <Panel
      title="주변 상권 지도"
      headerRight={
        <div className="flex items-center gap-2">
          {METRICS.map((item) => {
            const active = item === metric

            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => onMetricChange(item)}
                className={cn(
                  'focus-visible:outline-primary text-caption rounded-sm px-2 py-1 transition-colors focus-visible:outline focus-visible:-outline-offset-2',
                  active
                    ? 'bg-primary-soft text-primary font-semibold'
                    : 'text-text-secondary hover:bg-surface-muted',
                )}
              >
                {HEAT_METRIC_SPEC[item].label}
              </button>
            )
          })}
        </div>
      }
    >
      <div className="px-card flex flex-col gap-2.5 py-3.5">
        {/* 지도와 버튼을 겹쳐 놓는다. 버튼이 줄을 하나 차지하면 지도가 그만큼 눌린다 */}
        <div className="relative">
          {/* 확대한 뒤에만 나타난다. 평소에 두면 누를 일 없는 버튼이 지도를 가린다 */}
          {zoomed && (
            <button
              type="button"
              onClick={reset}
              aria-label="지도를 원래 배율로"
              title="원래 배율로"
              className="border-border-strong bg-surface text-text-secondary hover:bg-surface-muted focus-visible:outline-primary absolute top-1 right-1 z-10 rounded-sm border p-1.5 transition-colors focus-visible:outline focus-visible:-outline-offset-2"
            >
              <ZoomResetIcon className="size-4" />
            </button>
          )}

        <svg
          ref={svgRef}
          viewBox={viewBox}
          className={cn(
            'h-auto w-full touch-none select-none',
            zoomed && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
          )}
          role="img"
          aria-label={`${location.dongName}과 주변 행정동의 ${spec.label} 비교 지도`}
          {...handlers}
        >
          <defs>
            <pattern
              id={HATCH_ID}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" className="fill-surface" />
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-border-strong" strokeWidth="2" />
            </pattern>
          </defs>

          {/*
            면 → 조회한 동의 테두리 → 글자 순으로 층을 나눈다.

            동마다 면과 글자를 묶어 그리면 나중 동의 면이 앞 동의 이름표를 덮는다 —
            좁은 동일수록 이름이 옆 동으로 넘치니 거기서 글자가 잘려 보인다.
          */}
          <g>
            {projection.dongs.map((dong) => {
              const step = stepOf(dong.dongCode)
              const compared = byCode.has(dong.dongCode)
              /** 비교 대상인데 이 지표의 값이 없는 동. 0 으로 칠하면 '가장 적은 동' 이 된다 */
              const hatched = compared && step === null

              return (
                <path
                  key={dong.dongCode}
                  d={dong.path}
                  className={cn(
                    'transition-[fill] duration-200 motion-reduce:transition-none',
                    /*
                     * 빗금일 때는 fill 클래스를 아예 얹지 않는다.
                     *
                     * 빗금은 아래 fill 속성으로 넣는데, SVG presentation attribute 는
                     * CSS 보다 우선순위가 낮다. 클래스로 fill 을 한 번이라도 지정하면
                     * 그쪽이 이겨서 빗금이 사라지고 흰 칸으로 보인다 — '집계 안 됨' 과
                     * '비교 대상 밖' 이 구분되지 않는다.
                     *
                     * 비교 대상이 아닌 동을 칠하지 않는 이유는 따로다. 가장 연한
                     * 칸(heat-1)과 회색 배경은 색이 거의 같아서, 칠해 두면 '가장 적은 동'
                     * 과 구분되지 않는다.
                     */
                    hatched ? '' : step !== null ? HEAT_FILL[step] : 'fill-surface',
                    compared ? 'stroke-surface' : 'stroke-border',
                  )}
                  fill={hatched ? `url(#${HATCH_ID})` : undefined}
                  strokeWidth={(compared ? 2 : 1.5) / zoom}
                />
              )
            })}
          </g>

          {/*
            조회한 동의 테두리는 면을 전부 깐 뒤 다시 한 번 그린다.

            선은 경로 한가운데 그려져서 절반이 이웃 쪽으로 넘어간다. 면 레이어 안에서
            같이 그리면 나중에 그린 이웃의 면이 그 절반을 덮어, 테두리가 이웃과 맞닿은
            변에서만 얇아진다 — 한 바퀴 두께가 들쭉날쭉해 보이던 것이 이 때문이다.
          */}
          {currentDong && (
            <path
              d={currentDong.path}
              fill="none"
              className="stroke-primary"
              strokeWidth={3 / zoom}
              strokeLinejoin="round"
            />
          )}

          <g>
            {projection.dongs.map((dong) => {
              const neighbor = byCode.get(dong.dongCode)
              const value = neighbor ? spec.pick(neighbor) : null
              const step = stepOf(dong.dongCode)
              const current = dong.dongCode === location.dongCode

              /*
               * 이름표를 넣을 자리가 되는지 본다.
               *
               * 자치구에 따라 동 하나가 화면에서 30px 도 안 된다. 거기에 이름과 값을
               * 밀어 넣으면 옆 동 글자와 뒤엉켜 무엇 하나도 읽히지 않는다. 확대하면
               * 그만큼 넓어지므로 배율을 곱해서 판단한다 — 작은 동을 보려면 확대하면 된다.
               */
              const room = dong.width * zoom
              const showName = room >= MIN_LABEL_ROOM
              const showValue = room >= MIN_VALUE_ROOM

              return (
                /*
                  누르면 그 동으로 다시 조회한다. path 자체에 onClick 을 걸지 않는 이유는
                  키보드 때문이다 — path 는 포커스를 받지 못해 탭으로 닿을 수 없다.
                */
                <g
                  key={dong.dongCode}
                  role="button"
                  tabIndex={0}
                  aria-label={`${dong.dongName}으로 상권 분석하기`}
                  onClick={() => {
                    /* 끌어서 지도를 옮긴 것이면 상권을 바꾸지 않는다 */
                    if (wasDragged()) return
                    onSelectDong(dong.dongCode)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    onSelectDong(dong.dongCode)
                  }}
                  className="focus-visible:outline-primary cursor-pointer focus:outline-none focus-visible:outline-2"
                >
                  {/* 이름표만으로는 누를 자리가 좁다. 투명한 판을 깔아 손가락을 받는다 */}
                  <path d={dong.path} fill="transparent" />

                  {/*
                    paintOrder="stroke" 로 테두리를 글자 뒤에 깐다. 좁은 동은 이름이 옆
                    칸으로 넘어가는데, 테두리가 없으면 그 위에서 글자가 배경에 묻는다.

                    글자 크기를 배율로 나눈다. viewBox 를 줄이면 글자도 같이 커지는데,
                    그러면 확대해도 동과 글자가 함께 커져 자리가 나지 않는다. 화면에서
                    같은 크기를 유지해야 확대가 '글자 넣을 자리를 만드는' 일이 된다.
                  */}
                  {showName && (
                    <text
                      x={dong.labelX}
                      y={dong.labelY}
                      textAnchor="middle"
                      paintOrder="stroke"
                      fontSize={LABEL_FONT_SIZE / zoom}
                      strokeWidth={LABEL_HALO_WIDTH / zoom}
                      strokeLinejoin="round"
                      className={cn(
                        'pointer-events-none',
                        current ? 'font-bold' : 'font-medium',
                        neighbor ? heatTextClass(step) : 'fill-text-disabled',
                        heatHaloClass(neighbor ? step : null),
                      )}
                    >
                      {dong.dongName}
                    </text>
                  )}

                  {/* 비교 대상이 아닌 동에는 값이 없다. 이름만 흐리게 두고 넘어간다 */}
                  {neighbor && showName && showValue && (
                    <text
                      x={dong.labelX}
                      y={dong.labelY + VALUE_OFFSET / zoom}
                      textAnchor="middle"
                      paintOrder="stroke"
                      fontSize={VALUE_FONT_SIZE / zoom}
                      strokeWidth={LABEL_HALO_WIDTH / zoom}
                      strokeLinejoin="round"
                      className={cn(
                        'pointer-events-none tabular-nums',
                        heatTextClass(step),
                        heatHaloClass(step),
                      )}
                    >
                      {value === null ? '집계 안 됨' : spec.format(value)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
        </div>

        <div className="text-text-muted text-caption flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            적다
            <span className="flex gap-0.5">
              {HEAT_FILL.map((fill) => (
                <svg key={fill} width="18" height="8" aria-hidden="true">
                  <rect width="18" height="8" rx="2" className={fill} />
                </svg>
              ))}
            </span>
            많다
          </span>

          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <rect width="18" height="8" rx="2" fill={`url(#${HATCH_ID})`} />
            </svg>
            집계 안 됨
          </span>

          <span className="flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true">
              <rect
                width="17"
                height="7"
                x="0.5"
                y="0.5"
                rx="2"
                className="fill-surface stroke-border"
              />
            </svg>
            비교 대상 밖
          </span>

          <span className="ml-auto">동을 누르면 그 상권으로 다시 분석해요</span>
        </div>

        {missingCount > 0 && (
          <p className="text-text-muted text-caption">
            행정동이 개편된 {missingCount}곳은 경계를 찾지 못해 지도에서 빠졌어요. 아래 비교표에는
            그대로 있습니다.
          </p>
        )}

        {/* 공공누리 1유형이라 출처 표기가 의무다 */}
        <p className="text-text-disabled text-[10.5px]">
          행정동 경계 : 통계청 SGIS (공공누리 1유형) · vuski/admdongkor
        </p>
      </div>
    </Panel>
  )
}
