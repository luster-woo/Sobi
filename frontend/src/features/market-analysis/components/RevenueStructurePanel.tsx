import MarketPanel from '@/features/market-analysis/components/MarketPanel'
import StackedBar from '@/features/market-analysis/components/StackedBar'
import { formatEokText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'

interface RevenueStructurePanelProps {
  summary: MarketAnalysis['summary']
  revenueStructure: MarketAnalysis['revenueStructure']
}

/** 성비가 몇 %p 엇갈리는지. 양수면 매출이 남성 쪽으로 더 쏠렸다는 뜻 */
function getGenderGap(revenueMaleRatio: number, footTrafficMaleRatio: number) {
  return Math.round((revenueMaleRatio - footTrafficMaleRatio) * 10) / 10
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
 * revenueStructure 는 매출이 집계되지 않은 상권에서 null 이다(원본의 53%). 그 경우
 * 패널을 그리지 않는다 — 월 매출 추정 패널이 이미 "매출이 집계되지 않았어요" 로
 * 이유를 말하고 있어서, 같은 말을 하는 빈 패널을 하나 더 두면 화면만 길어진다.
 */
export default function RevenueStructurePanel({
  summary,
  revenueStructure,
}: RevenueStructurePanelProps) {
  if (!revenueStructure) return null

  const { byDayType, byGender } = revenueStructure
  const total = byDayType.weekdayRevenueMonthly + byDayType.weekendRevenueMonthly
  const genderGap = getGenderGap(byGender.maleRatio, summary.footTrafficGender.maleRatio)

  return (
    <MarketPanel
      title="매출 구조 — 요일과 성별"
      headerRight={
        <span className="text-text-muted text-[11.5px] tabular-nums">
          상권 전체 {formatEokText(total)}
        </span>
      }
    >
      <div className="flex flex-col gap-3.5 px-[15px] py-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-text-secondary text-[11.5px]">주중 · 주말 매출</p>

            <StackedBar
              segments={[
                {
                  label: `주중 ${Math.round(byDayType.weekdayRatio)}%`,
                  percent: byDayType.weekdayRatio,
                },
                {
                  label: `주말 ${Math.round(byDayType.weekendRatio)}%`,
                  percent: byDayType.weekendRatio,
                },
              ]}
            />

            <p className="text-text-secondary flex gap-4 text-[11.5px] tabular-nums">
              <span>주중 월 {formatEokText(byDayType.weekdayRevenueMonthly)}</span>
              <span>주말 월 {formatEokText(byDayType.weekendRevenueMonthly)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-text-secondary text-[11.5px]">성별 매출 구성</p>

            <StackedBar
              segments={[
                { label: `남성 ${Math.round(byGender.maleRatio)}%`, percent: byGender.maleRatio },
                {
                  label: `여성 ${Math.round(byGender.femaleRatio)}%`,
                  percent: byGender.femaleRatio,
                },
              ]}
            />

            <p className="text-text-secondary text-[11.5px] tabular-nums">
              유동인구 성비는 남성 {Math.round(summary.footTrafficGender.maleRatio)}% · 여성{' '}
              {Math.round(summary.footTrafficGender.femaleRatio)}%
            </p>
          </div>
        </div>

        <p className="text-text-secondary text-[11.5px] leading-relaxed">
          주말 매출 비중이 {Math.round(byDayType.weekendRatio)}% 예요.
          {/* 유동인구 성비와 매출 성비가 3%p 이상 엇갈릴 때만 짚어준다. 그 아래는 오차로 본다 */}
          {Math.abs(genderGap) >= 3 && (
            <>
              {' '}
              유동인구는 {summary.footTrafficGender.maleRatio > 50 ? '남성' : '여성'}이 많은데
              매출은 {genderGap > 0 ? '남성' : '여성'}에서 더 나옵니다 (
              {Math.abs(genderGap).toFixed(1)}%p 차이). 객단가나 방문 목적이 성별로 갈린다는
              신호예요.
            </>
          )}{' '}
          성별이 확인된 매출은 전체의 {Math.round(byGender.coverageRatio)}% 입니다.
        </p>
      </div>
    </MarketPanel>
  )
}
