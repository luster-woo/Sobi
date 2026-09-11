import { useState } from 'react'

import { useRepayInFull } from '@/features/loan-repayment/hooks/useRepayment'
import { formatWonText, maskAccountNo } from '@/features/loan-repayment/model/format'
import type { RepaymentProgress } from '@/features/loan-repayment/model/progress'
import type { LoanProduct, RepaymentDetail } from '@/features/loan-repayment/model/types'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import Panel from '@/shared/ui/Panel'
import { splitMoneyShort } from '@/shared/utils/formatters'

interface FullRepaymentCardProps {
  product: LoanProduct
  detail: RepaymentDetail
  progress: RepaymentProgress
}

function Figure({
  label,
  value,
  unit,
  note,
  emphasis = false,
}: {
  label: string
  value: string
  unit: string
  note: string
  emphasis?: boolean
}) {
  return (
    <div className="bg-surface-muted flex-1 rounded-md px-4 py-3.5">
      <p className="text-text-muted text-[11.5px]">{label}</p>
      <p
        className={
          emphasis
            ? 'text-primary mt-1.5 text-[25px] leading-none font-bold tracking-tight tabular-nums'
            : 'text-text mt-1.5 text-[25px] leading-none font-bold tracking-tight tabular-nums'
        }
      >
        {value}
        <small className="text-text-secondary text-[14px] font-normal">{unit}</small>
      </p>
      <p className="text-text-secondary mt-2 text-[11.5px] tabular-nums">{note}</p>
    </div>
  )
}

/**
 * 전액 상환(완납).
 *
 * 금융망이 일부 조기상환을 지원하지 않아 '한 번에 다 갚기' 만 있다.
 *
 * ⚠️ 되돌릴 수 없는 동작이다. 누르는 즉시 수천만 원이 출금되고, 완납하면 금융망에서
 *    계좌 자체가 삭제돼 상환 기록까지 사라진다. 그래서 버튼이 바로 API 를 부르지 않고
 *    확인 모달을 한 번 거친다. 모달 문구에 "기록을 더 이상 볼 수 없다" 를 적는 이유도
 *    그것이다 — 누르고 나서 알게 되면 늦는다.
 *
 * 완납 후 목록에서 이 상품이 빠지면서 탭이 사라진다. 마지막 대출이었다면 화면 전체가
 * 빈 상태가 되는데, 그때 토스트가 없으면 성공했는지 실패했는지 알 수가 없다.
 */
export default function FullRepaymentCard({ product, detail, progress }: FullRepaymentCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const showToast = useUiStore((state) => state.showToast)
  const { mutate: repay, isPending } = useRepayInFull()

  const payoff = splitMoneyShort(detail.totalPayoffAmount)
  const saved = splitMoneyShort(detail.interestSaved)
  const account = `${product.bankName} ${maskAccountNo(product.withdrawalAccountNo)}`

  /*
   * 시안에는 '원금 2,520만 + 오늘까지 이자 약 5만 원' 이라는 줄이 있었는데 뺐다.
   * 서버가 완납액을 총액 하나로만 주고 원금·이자를 나눠주지 않는다. 남은 원금
   * (remainingLoanBalance)으로 역산하려 해도 두 값의 관계가 보장되지 않아, 이자가
   * 음수로 나오는 경우가 생긴다. 확실히 아는 값(남은 회차)만 쓴다.
   */
  const payoffNote = `남은 ${progress.remainingCount}회를 한 번에 갚는 금액`

  const handleConfirm = () => {
    repay(product.accountNo, {
      onSuccess: () => {
        setConfirmOpen(false)
        showToast(`${product.accountName} 완납이 완료됐어요.`)
      },
      onError: () => showToast('완납에 실패했어요. 잠시 후 다시 시도해주세요.', 'danger'),
    })
  }

  return (
    <>
      <Panel title="전액 상환 (완납)">
        <div className="flex flex-col gap-3.5 px-[15px] py-3.5">
          <p className="text-text-secondary text-[12.5px] leading-relaxed">
            일부 금액 조기상환은 지원하지 않아요. 남은 대출을 한 번에 갚을 수 있어요.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Figure
              label="지금 완납하면"
              value={payoff.value}
              unit={payoff.unit}
              note={payoffNote}
            />
            <Figure
              label="아끼는 이자"
              value={saved.value}
              unit={saved.unit}
              note={`남은 ${progress.remainingCount}회분 기준`}
              emphasis
            />
          </div>

          <Button className="w-full" onClick={() => setConfirmOpen(true)}>
            지금 완납하기
          </Button>

          <p className="text-text-muted text-[11.5px]">
            출금 계좌 {account}에서 즉시 출금돼요 · 완납 후 자동이체는 자동 해지됩니다
          </p>
        </div>
      </Panel>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="지금 완납할까요?"
        description={`${product.accountName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button onClick={handleConfirm} loading={isPending}>
              완납하기
            </Button>
          </>
        }
      >
        <div className="text-body2 text-text-secondary flex flex-col gap-3 leading-relaxed">
          <p>
            <b className="text-text">{formatWonText(detail.totalPayoffAmount)}</b>이 {account}
            에서 즉시 출금됩니다.
          </p>
          <p>완납 후에는 이 대출의 상환 기록을 더 이상 볼 수 없어요.</p>
        </div>
      </Modal>
    </>
  )
}
