import GenderSlopeChart from '@/features/market-analysis/components/GenderSlopeChart'
import { formatBigWonText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import Panel from '@/shared/ui/Panel'

interface RevenueStructurePanelProps {
  summary: MarketAnalysis['summary']
  revenueStructure: MarketAnalysis['revenueStructure']
}

/**
 * 매출 성비가 유동인구 성비보다 몇 %p 남성 쪽인지.
 *
 * 유동인구와 견준 **쏠림**이다. 둘은 방향이 갈릴 수 있다 
 * — 매출 남 49.7 / 여 50.3 인데 유동인구가 남 44.8 이면, 
 * 여성 매출이 더 많으면서 동시에 남성 쪽으로 쏠린 상태다. 
 * 문구를 절대 비교로 쓰면 틀린다.
 *
 * 막대에 적힌 정수끼리 뺀다. 반올림 전 값으로 계산하면 화면에 '남성 50%'·'남성 45%'
 * 라고 써 놓고 차이는 4.9%p 라고 적히는데, 보이는 숫자로 검산이 안 되면 사용자는
 * 그 수치를 믿을 근거가 없다. 상권 지표에서 0.1%p 는 의미도 없다.
 */
function getGenderGap(revenueMalePercent: number, footTrafficMalePercent: number) {
  return revenueMalePercent - footTrafficMalePercent
}

/**
 * 비율을 정수로. 단, 0 도 100 도 아닌 값이 반올림으로 0 이나 100 이 되지 않게 막는다.
 *
 * 성비가 99.7 : 0.3 인 상권이 실제로 있다. 그냥 반올림하면 100 : 0 으로 적히는데,
 * 막대는 원래 비율로 그려져서 0% 라고 적힌 칸이 눈에 보이는 폭을 차지한다. 숫자와
 * 그림이 어긋나는 것도 문제지만, 매출이 있는데 '0%' 라고 쓰는 건 그냥 틀린 말이다.
 *
 * 진짜 0 과 100 은 그대로 둔다. 남성 매출이 한 푼도 없으면 0% 가 맞다.
 */
function roundShare(ratio: number): number {
  const rounded = Math.round(ratio)

  if (rounded === 0 && ratio > 0) return 1
  if (rounded === 100 && ratio < 100) return 99

  return rounded
}

/**
 * 100% 를 나눠 갖는 두 값의 라벨.
 *
 * 각각 반올림하면 합이 99 나 101 이 된다(53.5 / 46.5 → 54 · 47). 한쪽만 반올림하고
 * 나머지는 빼서 채운다 — 막대는 한 줄이라 합이 100 이 아니면 바로 눈에 띈다.
 */
function toPairPercents(firstRatio: number): [number, number] {
  const first = roundShare(firstRatio)

  return [first, 100 - first]
}

/**
 * 매출 구조 — 요일과 성별.
 *
 * 시안에 없던 패널이다. 응답의 revenueStructure 를 아무데도 쓰지 않고 있어서 더했다.
 *
 * 금액을 뜯어보니 이 블록은 점포당이 아니라 상권 전체 매출이다.
 *   weekday 141억 + weekend 76억 = 217억 ≈ 868곳 × 2,502만 원
 * 그래서 제목 옆에 상권 전체 규모를 함께 띄운다 — 점포당 매출만으로는 이 상권이
 * 얼마나 큰 시장인지 알 수 없다.
 *
 * 성별 금액 합(190억)이 전체(217억)보다 작다. 성별이 확인되지 않은 매출이 12.6%
 * 있어서인데(coverageRatio 87.4), 이걸 안 밝히면 두 비율이 전체를 덮는 것처럼 읽힌다.
 * 그래서 각주로 반드시 적는다.
 *
 * 유동인구 성비는 막대를 따로 준다. 각주로 매출 막대 밑에 적었더니 '남성 54%' 바로
 * 아래 '남성 44%' 가 붙어서, 같은 값을 두 번 말하다 어긋난 것처럼 보였다. 둘은 분모가
 * 다른 별개 지표다 — 매출은 성별이 확인된 매출 합이고, 이쪽은 총 유동인구다.
 *
 * revenueStructure 는 매출이 집계되지 않은 상권에서 null 이다(원본의 53%). 그 경우
 * 패널을 그리지 않는다 — 월 매출 추정 패널이 이미 "매출이 집계되지 않았어요" 로
 * 이유를 말하고 있어서, 같은 말을 하는 빈 패널을 하나 더 두면 화면만 길어진다.
 *
 * 블록은 왔는데 비율만 null 인 경우도 같이 접는다. 매출 합계가 0 이면 서버가 비율을
 * 계산하지 못해 null 을 주는데, 이 패널은 네 비율이 전부 막대라 하나라도 없으면 그림이
 * 성립하지 않는다. 사용자 입장에선 '매출 정보가 없다' 로 똑같은 상황이다.
 */
export default function RevenueStructurePanel({
  summary,
  revenueStructure,
}: RevenueStructurePanelProps) {
  if (!revenueStructure) return null

  const { byDayType, byGender } = revenueStructure
  const { weekdayRatio, weekendRatio } = byDayType
  const { maleRatio, femaleRatio, coverageRatio } = byGender

  if (weekdayRatio === null || weekendRatio === null || maleRatio === null || femaleRatio === null) {
    return null
  }

  const total = byDayType.weekdayRevenueMonthly + byDayType.weekendRevenueMonthly

  const [weekdayPercent, weekendPercent] = toPairPercents(weekdayRatio)
  const [malePercent, femalePercent] = toPairPercents(maleRatio)

  /*
   * 유동인구 성비는 매출과 분모가 다르다(총 유동인구). 매출 비율이 있어도 이쪽만
   * 없을 수 있어서, 없으면 그 막대만 빼고 나머지는 그대로 보여준다.
   */
  const footTrafficMaleRatio = summary.footTrafficGender.maleRatio
  /* 그림에 적히는 정수. 문장도 같은 값으로 말해야 검산이 된다 */
  const [footTrafficMalePercent] =
    footTrafficMaleRatio === null || summary.footTrafficGender.femaleRatio === null
      ? [null]
      : toPairPercents(footTrafficMaleRatio)

  const genderGap =
    footTrafficMalePercent === null ? null : getGenderGap(malePercent, footTrafficMalePercent)

  return (
    <Panel
      title="매출 구조"
      headerRight={
        <span className="text-text-muted text-[11.5px] tabular-nums">
          상권 전체 {formatBigWonText(total)}
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-[15px] py-3.5">
        {/*
          주중·주말은 슬로프에 태우지 않는다. 저쪽은 '사람 → 매출' 이라는 한 축의 변화인데
          요일은 그런 축이 없어서, 같은 그림에 넣으면 무엇에서 무엇으로 가는 선인지 흐려진다.
        */}
        {/* 보조 열(292px)에서는 두 칸이 세로로 쌓인다. flex-wrap 이 알아서 접는다 */}
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <div>
            <p className="text-text-secondary text-[11.5px]">주중 매출</p>
            <p className="text-text text-[19px] leading-tight font-bold tabular-nums">
              {weekdayPercent}%
              <span className="text-text-secondary ml-1.5 text-[11.5px] font-normal">
                월 {formatBigWonText(byDayType.weekdayRevenueMonthly)}
              </span>
            </p>
          </div>

          <div>
            <p className="text-text-secondary text-[11.5px]">주말 매출</p>
            <p className="text-text text-[19px] leading-tight font-bold tabular-nums">
              {weekendPercent}%
              <span className="text-text-secondary ml-1.5 text-[11.5px] font-normal">
                월 {formatBigWonText(byDayType.weekendRevenueMonthly)}
              </span>
            </p>
          </div>
        </div>

        <div className="border-border-subtle border-t pt-3.5">
          <p className="text-text-secondary text-[11.5px]">
            오간 사람에서 매출로, 성비가 어떻게 달라지나
          </p>

          {/*
            유동인구 성비는 매출과 분모가 다르다(총 유동인구). 매출 비율이 있어도 이쪽만
            없을 수 있는데, 그러면 이을 두 점 중 하나가 없어 선을 그릴 수 없다.
            그때는 매출 성비만 숫자로 적는다.
          */}
          {footTrafficMalePercent === null ? (
            <p className="text-text mt-1.5 text-[13px] font-bold tabular-nums">
              남성 {malePercent}% · 여성 {femalePercent}%
              <span className="text-text-secondary ml-2 text-[11.5px] font-normal">
                오간 사람의 성비는 집계되지 않았어요
              </span>
            </p>
          ) : (
            <div className="mt-1 max-w-[440px]">
              <GenderSlopeChart
                footTrafficMalePercent={footTrafficMalePercent}
                revenueMalePercent={malePercent}
              />
            </div>
          )}

          <p className="text-text-secondary mt-1 flex flex-wrap gap-x-4 text-[11.5px] tabular-nums">
            <span>남성 매출 월 {formatBigWonText(byGender.maleRevenueMonthly)}</span>
            <span>여성 매출 월 {formatBigWonText(byGender.femaleRevenueMonthly)}</span>
          </p>
        </div>

        <p className="text-text-secondary text-[11.5px] leading-relaxed">
          {/*
            원인을 단정하지 않는다. 우리가 아는 것은 '비중이 다르다' 까지다. 유동인구는
            그 업종의 손님이 아니라 상권을 오간 사람 전부라(seoul_commercial_data 의
            total_population), 남성 비중이 높은 것이 객단가 때문인지 그냥 더 자주 와서인지
            이 데이터로는 못 가린다. 결제자와 소비자가 다른 경우(회식·가족·법인카드)도
            섞여 있다.
          */}
          {genderGap !== null && Math.abs(genderGap) >= 3 && (
            <>
              {genderGap > 0 ? '남성' : '여성'} 손님이 더 자주 오거나 한 번에 더 많이 쓴다는 뜻일
              수 있어요.{' '}
            </>
          )}
          {coverageRatio !== null &&
            `성별이 확인된 매출은 전체의 ${roundShare(coverageRatio)}% 입니다.`}
        </p>
      </div>
    </Panel>
  )
}

