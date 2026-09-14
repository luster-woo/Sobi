import { countRemaining } from '@/features/application/model/documents'
import type { ApplicationDetail, PayoutAccount } from '@/features/application/model/types'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Select from '@/shared/ui/Select'
import { formatMoneyShort } from '@/shared/utils/formatters'

interface ApplicationSubmitFormProps {
  detail: ApplicationDetail
  accounts: PayoutAccount[]
  /** 숫자만 담긴 문자열. 빈 문자열이면 아직 입력 전 */
  amount: string
  onAmountChange: (value: string) => void
  accountNo: string
  onAccountNoChange: (value: string) => void
  isSubmitting: boolean
  onSubmit: () => void
}

/** 입력하는 동안에도 자릿수를 읽을 수 있게 콤마를 넣는다 */
function withComma(digits: string): string {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

/**
 * 금액·계좌 입력과 최종 제출.
 *
 * 금액은 대출만 받는다. 지원사업은 지원금이 정해져 있어 사용자가 정할 게 없다.
 *
 * 막는 이유를 버튼 문구로 알려준다. 비활성 버튼만 있고 이유가 없으면 사용자가 무엇을
 * 더 해야 하는지 알 수 없다.
 */
export default function ApplicationSubmitForm({
  detail,
  accounts,
  amount,
  onAmountChange,
  accountNo,
  onAccountNoChange,
  isSubmitting,
  onSubmit,
}: ApplicationSubmitFormProps) {
  const isLoan = detail.loanId !== null
  const { minAmount, maxAmount } = detail.product

  /*
   * 금액 범위가 없으면 검증할 기준이 없다. 대출은 항상 범위가 오지만 지원사업을
   * 같은 타입으로 받아서 null 이 가능하다. 그럴 땐 범위 문구와 검사를 건너뛴다.
   */
  const hasRange = minAmount !== null && maxAmount !== null
  const range = hasRange
    ? `${formatMoneyShort(minAmount)} ~ ${formatMoneyShort(maxAmount)}`
    : undefined

  const amountNumber = amount ? Number(amount) : null
  const amountError =
    hasRange && amountNumber !== null && (amountNumber < minAmount || amountNumber > maxAmount)
      ? `${range} 사이로 입력해 주세요`
      : undefined

  const remaining = countRemaining(detail.documents)
  const needsAmount = isLoan && (amountNumber === null || Boolean(amountError))
  const blocked = remaining > 0 || needsAmount || !accountNo

  const label = (() => {
    if (remaining > 0) return `신청하기 · 서류 ${remaining}건 남음`
    if (needsAmount) return '신청하기 · 금액 입력 필요'
    if (!accountNo) return '신청하기 · 출금 계좌 선택 필요'
    return '신청하기'
  })()

  return (
    <div className="flex flex-col gap-6">
      {isLoan && (
        <section>
          <h2 className="text-body2 text-text-secondary mb-3 font-semibold">신청 금액</h2>
          <Input
            // 콤마를 보여줘야 해서 type=number 를 쓰지 않는다. 자판만 숫자로 띄운다
            inputMode="numeric"
            value={withComma(amount)}
            onChange={(event) => onAmountChange(event.target.value.replace(/\D/g, ''))}
            placeholder="0"
            rightSlot={<span className="text-body2 text-text-secondary">원</span>}
            error={amountError}
            helperText={range}
          />
        </section>
      )}

      <section>
        <h2 className="text-body2 text-text-secondary mb-3 font-semibold">출금 계좌</h2>
        <Select
          options={accounts.map((account) => ({
            value: account.accountNo,
            label: `${account.bankName} ${account.accountNo}`,
          }))}
          value={accountNo}
          onChange={(event) => onAccountNoChange(event.target.value)}
          placeholder="계좌를 선택해 주세요"
          helperText="입력한 출금 계좌는 대출 실행금 입금과 자동이체(자동상환) 계좌로 등록돼요."
        />
      </section>

      <Button
        className="w-full"
        size="lg"
        disabled={blocked}
        loading={isSubmitting}
        onClick={onSubmit}
      >
        {label}
      </Button>
    </div>
  )
}
