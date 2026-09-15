import { formatItemRate, isGrant } from '@/features/funding-plan/model/combination'
import type { FundingCombination, FundingItem } from '@/features/funding-plan/model/types'
import Button from '@/shared/ui/Button'
import Panel from '@/shared/ui/Panel'
import { formatMoneyShort, splitMoneyShort } from '@/shared/utils/formatters'

interface FundingCombinationCardProps {
  combination: FundingCombination
  /** 몇 번째 추천인지. 제목에 쓴다 */
  order: number
  /** 사용자가 입력한 필요 금액(원). 초과 조달 안내에 쓴다 */
  targetAmount: number
  /**
   * 구성 상품을 눌렀을 때. 상세 모달은 페이지가 띄운다.
   *
   * 여기서 직접 띄우지 않는 이유는 층 때문이다. 상세 모달이 loan·support-program
   * 것이라, 이 파일에서 부르면 feature 끼리 물린다. 페이지는 원래 feature 를
   * 가져다 쓰는 자리다.
   */
  onOpenItem: (item: FundingItem) => void
}

function Summary({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border-border-subtle border-r border-b p-3.5 last:border-r-0">
      <p className="text-text-muted text-[11.5px]">{label}</p>
      <p className="text-text mt-1 text-[19px] font-bold tracking-tight tabular-nums">
        {value}
        <small className="text-text-secondary text-[11.5px] font-normal">{unit}</small>
      </p>
    </div>
  )
}

/**
 * 대표 조합 카드.
 *
 * 왼쪽에 구성 상품, 오른쪽에 요약 네 값. 상품 목록이 길어질 수 있어 왼쪽을 늘어나게
 * 두고 요약은 280px 로 고정한다.
 *
 * 무상 지원금은 금리 자리에 '무상' 이 들어간다. 금리 0 으로 판별한다 — type 이
 * SUPPORT 여도 융자성(이자 있는) 상품이 섞여 있다.
 *
 * ⚠️ '이 조합으로 진행' 과 '구성 상품 보기' 는 아직 눌리지 않는다.
 *    진행    /funding/batch 가 application 테이블에 행을 만드는데 그 테이블에
 *            support_program_id 가 없어서 지원사업 항목을 저장할 수 없다.
 *    구성 보기 이동할 화면이 정해지지 않았다. 상품별 상세를 펼치는 형태가 자연스러운데
 *            items 에 은행명·기간이 없어 보여줄 내용이 부족하다.
 */
export default function FundingCombinationCard({
  combination,
  order,
  targetAmount,
  onOpenItem,
}: FundingCombinationCardProps) {
  const total = splitMoneyShort(combination.totalFinancingAmount)
  const monthly = splitMoneyShort(combination.monthlyRepaymentAmount)
  const repayment = splitMoneyShort(combination.totalRepaymentAmount)

  // 요청과 응답을 대조해야 나오는 값이라 서버가 알려줄 수 없다. 상품마다 최소 금액이
  // 있어 목표를 넘기는 조합이 나올 수 있고, 그걸 말해주지 않으면 사용자가 놓친다
  const excess = combination.totalFinancingAmount - targetAmount

  return (
    <Panel title={`추천 조합 ${order}`}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-3 p-4">
          <ol className="flex flex-col">
            {combination.items.map((item, index) => (
              <li
                key={`${item.sourceType}-${item.id}`}
                className="border-border-subtle border-b last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  aria-label={`${item.name} 상세 보기`}
                  className="hover:bg-surface-muted focus-visible:outline-primary -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-2.5 text-left transition-colors focus-visible:outline focus-visible:-outline-offset-2"
                >
                  <span className="bg-bg-canvas text-text-secondary grid size-5 shrink-0 place-items-center rounded-full text-[11px] tabular-nums">
                    {index + 1}
                  </span>

                  <span className="text-body2 text-text min-w-0 flex-1 truncate">{item.name}</span>

                  <span className="text-body2 text-text shrink-0 font-semibold tabular-nums">
                    {formatMoneyShort(item.allocatedAmount)}
                  </span>

                  <span
                    className={
                      isGrant(item)
                        ? 'text-primary w-[72px] shrink-0 text-right text-[12px] font-medium'
                        : 'text-text-secondary w-[72px] shrink-0 text-right text-[12px] tabular-nums'
                    }
                  >
                    {formatItemRate(item)}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {excess > 0 && (
            <p className="text-text-secondary text-[11.5px] leading-relaxed">
              필요 금액보다 {formatMoneyShort(excess)} 더 조달돼요. 상품마다 최소 신청 금액이 있어
              딱 맞추기 어려운 경우예요.
            </p>
          )}
        </div>

        <div className="border-border-subtle lg:border-l">
          <div className="grid grid-cols-2">
            <Summary label="총 조달액" value={total.value} unit={total.unit} />
            <Summary label="평균 금리" value={`연 ${combination.averageInterestRate}`} unit="%" />
            <Summary label="월 상환액" value={monthly.value} unit={monthly.unit} />
            {/* 총 이자 대신 총 상환액. 조합을 가르는 값이고 서버의 정렬 1순위다 */}
            <Summary label="총 상환액" value={repayment.value} unit={repayment.unit} />
          </div>

          {/*
            조달액과 상환액이 왜 다른지 설명한다. 무상 지원금은 받기만 하고 갚지 않아서
            그만큼 차이가 나는데, 그걸 말해주지 않으면 숫자가 틀린 것처럼 보인다.
            총 이자는 여기로 옮겼다 — 상환액 안에 포함된 값이라 타일로 나란히 두면
            두 번 세는 것처럼 읽힌다.
          */}
          <p className="text-text-secondary border-border-subtle border-t px-3.5 pt-3 text-[11.5px] leading-relaxed">
            {combination.grantAmount > 0 && (
              <>
                무상 지원금{' '}
                <b className="text-primary">{formatMoneyShort(combination.grantAmount)}</b> 포함
                ·{' '}
              </>
            )}
            대출 {formatMoneyShort(combination.loanPrincipal)} · 이자{' '}
            {formatMoneyShort(combination.totalInterest)}
          </p>

          <div className="p-3.5">
            <Button className="w-full" disabled>
              이 조합으로 진행
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
