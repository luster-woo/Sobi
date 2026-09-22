import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber'

interface GenderSlopeChartProps {
  /** 오간 사람 중 남성 비중(%) */
  footTrafficMalePercent: number
  /** 매출 중 남성 비중(%) */
  revenueMalePercent: number
}

/*
 * 그림 좌표. 실제 표시 크기는 CSS 가 정하고 여기서는 비율만 잡는다.
 *
 * 보조 열(기본 292px)에 들어가야 해서 가로를 빠듯하게 잡았다. 그래서 점 옆에는
 * 숫자만 적고 '남성·여성' 은 위 범례로 뺐다 — '남성 45%' 를 양쪽에 네 번 적으면
 * 좁은 열에서 글자가 축을 침범한다.
 */
const VIEW_WIDTH = 300
const VIEW_HEIGHT = 150
const LEFT_X = 56
const RIGHT_X = 244
/** 0% 와 100% 가 놓이는 y */
const TOP_Y = 20
const BOTTOM_Y = 116

/**
 * 두 이름표가 이만큼은 떨어져야 한다.
 *
 * 성비가 49 : 51 이면 두 점의 y 차이가 2px 도 안 돼서 숫자가 포개진다. 실제로 그런
 * 상권이 흔하다 — 성비는 대개 반반 근처다.
 */
const LABEL_MIN_GAP = 15

/** 비중(%)을 y 좌표로. 위가 100%, 아래가 0% 다 — 높을수록 위로 간다 */
function toY(percent: number): number {
  return BOTTOM_Y - (percent / 100) * (BOTTOM_Y - TOP_Y)
}

/**
 * 겹치는 두 이름표를 벌린다.
 *
 * 점은 제자리에 두고 글자만 민다. 점을 옮기면 그림이 데이터와 달라진다.
 * 큰 값(y 가 작은 쪽)이 위로, 작은 값이 아래로 간다 — 벌려 놓고도 위아래 순서가
 * 뒤집히면 어느 쪽이 큰지 잘못 읽힌다.
 */
function separateLabels(first: number, second: number): [number, number] {
  if (Math.abs(first - second) >= LABEL_MIN_GAP) return [first, second]

  const middle = (first + second) / 2
  const half = LABEL_MIN_GAP / 2

  return first <= second ? [middle - half, middle + half] : [middle + half, middle - half]
}

/**
 * 오간 사람 → 매출, 성비가 어떻게 달라지는가.
 *
 * 두 값을 막대 두 개로 나란히 놓고 눈으로 견주게 하는 대신, 변화 자체를 선으로 그린다.
 * 이 패널이 말하려는 것이 "상권을 오간 사람의 성비와 실제로 돈을 쓴 성비가 어긋난다"
 * 하나라, 그 어긋남이 곧 선의 기울기가 되어야 그림이 문장을 대신한다.
 *
 * 색을 남녀로 가른다. 여기서는 초록이 '매출' 이 아니라 '남성' 을 뜻한다 — 한 그림 안에서
 * 두 계열이 좌우로 교차하므로 선을 구분할 축이 성별밖에 없다.
 *
 * 들어올 때 남성 선은 맨 위에서, 여성 선은 맨 아래에서 제자리를 찾아온다. 두 선이
 * 반대 방향에서 좁혀 들어오면 '100% 를 나눠 갖는 관계' 가 움직임만으로 읽힌다.
 * 여성 값을 따로 애니메이션하지 않고 100 에서 빼는 이유도 그것이다 — 남성이 100 에서
 * 출발하면 여성은 자동으로 0 에서 출발하고, 도중에도 둘의 합이 항상 100 이다.
 */
export default function GenderSlopeChart({
  footTrafficMalePercent,
  revenueMalePercent,
}: GenderSlopeChartProps) {
  const maleTraffic = useAnimatedNumber(footTrafficMalePercent, { from: 100 })
  const maleRevenue = useAnimatedNumber(revenueMalePercent, { from: 100 })

  const femaleTraffic = 100 - maleTraffic
  const femaleRevenue = 100 - maleRevenue

  const maleTrafficY = toY(maleTraffic)
  const femaleTrafficY = toY(femaleTraffic)
  const maleRevenueY = toY(maleRevenue)
  const femaleRevenueY = toY(femaleRevenue)

  /* 이름표 y 는 따로 잡는다. 겹칠 때만 벌어지고 그 외에는 점과 같은 높이다 */
  const [maleTrafficLabelY, femaleTrafficLabelY] = separateLabels(maleTrafficY, femaleTrafficY)
  const [maleRevenueLabelY, femaleRevenueLabelY] = separateLabels(maleRevenueY, femaleRevenueY)

  /* 최종값으로 적는다. 움직이는 동안의 반올림값이 문구로 남으면 검산이 안 된다 */
  const gap = Math.round(revenueMalePercent - footTrafficMalePercent)

  return (
    <div className="flex flex-col gap-1">
      <div className="text-text-secondary text-caption flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary inline-block size-2 rounded-full" />
          남성
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-alt inline-block size-2 rounded-full" />
          여성
        </span>

        {/* 격차가 오차 수준이면 적지 않는다. 0%p 나 1%p 를 굳이 짚으면 없는 신호를 만든다 */}
        {Math.abs(gap) >= 3 && (
          <span className="text-warning ml-auto font-bold tabular-nums">
            {gap > 0 ? '남성' : '여성'} +{Math.abs(gap)}%p
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `오간 사람의 남성 비중 ${Math.round(footTrafficMalePercent)}%가 ` +
          `매출에서는 ${Math.round(revenueMalePercent)}%입니다`
        }
      >
        {/* 두 시점을 세우는 기준선. 선이 어디서 어디로 가는지 알려준다 */}
        <line x1={LEFT_X} y1={TOP_Y - 8} x2={LEFT_X} y2={BOTTOM_Y + 8} className="stroke-border" />
        <line
          x1={RIGHT_X}
          y1={TOP_Y - 8}
          x2={RIGHT_X}
          y2={BOTTOM_Y + 8}
          className="stroke-border"
        />

        <text
          x={LEFT_X}
          y={BOTTOM_Y + 26}
          textAnchor="middle"
          className="fill-text-muted text-caption"
        >
          오간 사람
        </text>
        <text
          x={RIGHT_X}
          y={BOTTOM_Y + 26}
          textAnchor="middle"
          className="fill-text-muted text-caption"
        >
          매출
        </text>

        <line
          x1={LEFT_X}
          y1={maleTrafficY}
          x2={RIGHT_X}
          y2={maleRevenueY}
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1={LEFT_X}
          y1={femaleTrafficY}
          x2={RIGHT_X}
          y2={femaleRevenueY}
          className="stroke-alt"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle cx={LEFT_X} cy={maleTrafficY} r="4.5" className="fill-primary" />
        <circle cx={RIGHT_X} cy={maleRevenueY} r="4.5" className="fill-primary" />
        <circle cx={LEFT_X} cy={femaleTrafficY} r="4.5" className="fill-alt" />
        <circle cx={RIGHT_X} cy={femaleRevenueY} r="4.5" className="fill-alt" />

        {/* 이름표는 점 바깥쪽에. 안쪽에 두면 선이 교차하는 가운데에서 겹친다 */}
        <text
          x={LEFT_X - 11}
          y={maleTrafficLabelY + 4}
          textAnchor="end"
          className="fill-primary text-caption font-bold tabular-nums"
        >
          {Math.round(maleTraffic)}%
        </text>
        <text
          x={LEFT_X - 11}
          y={femaleTrafficLabelY + 4}
          textAnchor="end"
          className="fill-alt text-caption font-bold tabular-nums"
        >
          {Math.round(femaleTraffic)}%
        </text>
        <text
          x={RIGHT_X + 11}
          y={maleRevenueLabelY + 4}
          className="fill-primary text-caption font-bold tabular-nums"
        >
          {Math.round(maleRevenue)}%
        </text>
        <text
          x={RIGHT_X + 11}
          y={femaleRevenueLabelY + 4}
          className="fill-alt text-caption font-bold tabular-nums"
        >
          {Math.round(femaleRevenue)}%
        </text>
      </svg>
    </div>
  )
}
