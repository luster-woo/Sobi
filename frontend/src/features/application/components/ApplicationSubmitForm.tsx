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
 * 금액·계좌는 돈이 오가는 신청에만 받는다. '기타' 지원사업(컨설팅·교육 등)은 금액
 * 범위가 없고 서버도 둘 다 받지 않는다 — 그래서 범위 유무로 가른다.
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
   * 범위가 있으면 돈이 오가는 신청이다. 대출은 항상 있고, 지원사업은 '기타' 일 때만
   * 없다. 이 하나로 금액 입력·계좌 선택·제출 본문이 모두 갈린다.
   */
  const range = amountRange(detail)
  const needsMoney = range !== null

  const rangeText = range
    ? `${formatMoneyShort(range.min)} ~ ${formatMoneyShort(range.max)}`
    : undefined

  const amountNumber = amount ? Number(amount) : null
  const amountError =
    range && amountNumber !== null && (amountNumber < range.min || amountNumber > range.max)
      ? `${rangeText} 사이로 입력해 주세요`
      : undefined

  const remaining = countRemaining(detail.documents)
  const needsAmount = needsMoney && (amountNumber === null || Boolean(amountError))
  const needsAccount = needsMoney && accountId === null
  const blocked = remaining > 0 || needsAmount || needsAccount

  const label = (() => {
    if (remaining > 0) return `신청하기 · 서류 ${remaining}건 남음`
    if (needsAmount) return '신청하기 · 금액 입력 필요'
    if (needsAccount) return '신청하기 · 출금 계좌 선택 필요'
    return '신청하기'
  })()

  return (
    <div className="flex flex-col gap-6">
      {needsMoney && (
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

      {/* 돈이 오가지 않는 공고는 계좌도 받지 않는다 */}
      {needsMoney && (
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
