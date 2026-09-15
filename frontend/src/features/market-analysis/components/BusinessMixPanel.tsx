import ComparisonBar from '@/features/market-analysis/components/ComparisonBar'
import MiniPanel from '@/features/market-analysis/components/MiniPanel'
import { getBusinessMixRest } from '@/features/market-analysis/model/businessMix'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'

interface BusinessMixPanelProps {
  business: MarketAnalysis['business']
  businessMix: MarketAnalysis['businessMix']
}

/** '868곳·9.9%' · 비율을 못 구하면 '868곳' 만 */
const mixValue = (storeCount: number, sharePercent: number | null) => {
  const count = `${storeCount.toLocaleString('ko-KR')}곳`

  return sharePercent === null ? count : `${count}·${sharePercent.toFixed(1)}%`
}

/**
 * 업종 구성 — 이 행정동에 어떤 가게가 몇 곳 있는지.
 *
 * 막대 길이를 sharePercent 그대로(100% 기준) 쓰지 않는다. 실제 데이터에서 1등 업종이
 * 9.9% 라서, 100% 기준으로 그리면 막대가 전부 10분의 1 길이가 되어 서로 비교가 안 된다.
 * 그래서 목록 중 가장 큰 항목을 100% 로 잡고 나머지를 그에 견준다. 정확한 비율은
 * 오른쪽 숫자가 말해주고, 막대는 항목끼리의 상대 크기만 보여주는 역할이다.
 *
 * '기타' 는 막대에서 뺀다. 나머지 전부를 합친 값이라 대개 목록 1등보다 훨씬 커서,
 * 같이 그리면 그것만 길고 나머지는 다 뭉개진다. 아래 한 줄 문장으로 보여준다.
 */
export default function BusinessMixPanel({ business, businessMix }: BusinessMixPanelProps) {
  const rest = getBusinessMixRest(businessMix)
  /*
   * 비율이 null 인 항목은 막대 길이를 정할 수 없어 0 으로 둔다. 그게 '비율이 0'
   * 이 아니라 '알 수 없음' 이라는 건 오른쪽 숫자가 '-' 로 말해준다.
   */
  const maxShare = Math.max(...businessMix.items.map((item) => item.sharePercent ?? 0), 1)

  return (
    <MiniPanel
      title="업종 구성"
      headerRight={
        <span className="text-text-muted text-[11.5px] tabular-nums">
          전체 {businessMix.totalStoreCount.toLocaleString('ko-KR')}곳
        </span>
      }
    >
      <div className="flex flex-col gap-2.5">
        {businessMix.items.map((item) => (
          <ComparisonBar
            key={item.code}
            label={item.name}
            value={mixValue(item.storeCount, item.sharePercent)}
            ratio={(item.sharePercent ?? 0) / maxShare}
            // 조회한 업종이 어느 줄인지 초록으로 표시한다
            highlight={item.code === business.code}
            labelWidth={62}
            valueWidth={78}
          />
        ))}
      </div>

      {rest && (
        <p className="text-text-secondary text-[11.5px] leading-relaxed tabular-nums">
          그 외 업종 {mixValue(rest.storeCount, rest.sharePercent)}
        </p>
      )}
    </MiniPanel>
  )
}
