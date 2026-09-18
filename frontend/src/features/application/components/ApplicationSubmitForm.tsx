import { countRemaining } from '@/features/application/model/documents'
import { amountRange } from '@/features/application/model/summary'
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
  /** 고른 계좌의 account.id. 아직 안 골랐으면 null */
  accountId: number | null
  onAccountIdChange: (value: number | null) => void
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
 * 금액·계좌는 대출에서만 받는다. 지원사업은 유형이 '지원금' 이든 '대출' 이든 우리가
 * 돈을 옮기지 않아서 입력란 자체를 그리지 않는다 — 받아도 쓸 데가 없다.
 *
 * 막는 이유를 버튼 문구로 알려준다. 비활성 버튼만 있고 이유가 없으면 사용자가 무엇을
 * 더 해야 하는지 알 수 없다.
 */
export default function ApplicationSubmitForm({
  detail,
  accounts,
  amount,
  onAmountChange,
  accountId,
  onAccountIdChange,
  isSubmitting,
  onSubmit,
}: ApplicationSubmitFormProps) {
  /*
   * 대출인지로 가른다. 이 하나로 금액 입력·계좌 선택·제출 본문이 다 갈린다.
   *
   * 범위 유무(amountRange !== null)로 가르지 않는다. 그러면 한도가 비어 있는 상품에서
   * 입력란이 통째로 사라지는데, 서버는 그래도 금액을 요구한다.
   */
  const isLoan = detail.loan !== null
  const range = amountRange(detail)

  const rangeText = range
    ? `${formatMoneyShort(range.min)} ~ ${formatMoneyShort(range.max)}`
    : undefined

  const amountNumber = amount ? Number(amount) : null
  const amountError =
    range && amountNumber !== null && (amountNumber < range.min || amountNumber > range.max)
      ? `${rangeText} 사이로 입력해 주세요`
      : undefined

  const remaining = countRemaining(detail.documents)
  const needsAmount = isLoan && (amountNumber === null || Boolean(amountError))
  const needsAccount = isLoan && accountId === null
  const blocked = remaining > 0 || needsAmount || needsAccount

  const label = (() => {
    if (remaining > 0) return `신청하기 · 서류 ${remaining}건 남음`
    if (needsAmount) return '신청하기 · 금액 입력 필요'
    if (needsAccount) return '신청하기 · 출금 계좌 선택 필요'
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
            helperText={rangeText}
          />
        </section>
      )}

      {/* 지원사업은 우리가 돈을 옮기지 않아 계좌를 받지 않는다 */}
      {isLoan && (
        <section>
          <h2 className="text-body2 text-text-secondary mb-3 font-semibold">출금 계좌</h2>
          <Select
            /*
             * 값은 account.id 다. 제출이 accountId 를 요구하고 계좌번호로는 지목할 수
             * 없다. Select 가 문자열만 다뤄서 넣고 뺄 때 변환한다.
             */
            options={accounts.map((account) => ({
              value: String(account.accountId),
              label: `${account.bankName} ${account.accountNo}`,
            }))}
            value={accountId === null ? '' : String(accountId)}
            onChange={(event) =>
              onAccountIdChange(event.target.value ? Number(event.target.value) : null)
            }
            placeholder="계좌를 선택해 주세요"
            helperText="입력한 출금 계좌는 대출 실행금 입금과 자동이체(자동상환) 계좌로 등록돼요."
          />
        </section>
      )}

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
