import { useId } from 'react'

import { countRemaining } from '@/features/application/model/documents'
import { amountRange } from '@/features/application/model/summary'
import type { ApplicationDetail, PayoutAccount } from '@/features/application/model/types'
import Button from '@/shared/ui/Button'
import Select from '@/shared/ui/Select'
import { cn } from '@/shared/utils/cn'
import { formatMoneyShort, toKoreanMoney } from '@/shared/utils/formatters'

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
 * 입력칸 안에 들어가는 보조 버튼.
 *
 * 공용 Button 을 쓰지 않는다. 가장 작은 sm 이 34px 인데 입력칸이 48px 이라 위아래가
 * 4px씩만 남아 단추가 칸을 꽉 메운다. 여기 필요한 것은 눌러서 값을 채우는 거들기용이라
 * 입력값보다 눈에 띄면 안 된다.
 */
function QuickButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-border text-caption text-text-secondary hover:bg-surface-muted disabled:text-text-disabled h-7 shrink-0 rounded-sm border px-2 transition-colors disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
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

  /*
   * 한도를 벗어나도 병기한다. 오히려 그때 가장 쓸모 있다 — 범위를 벗어나는 흔한 이유가
   * 0 을 더 치거나 덜 친 것인데, '1,000만 원 ~ 3,000만 원 사이로' 라는 문구는 자릿수를
   * 직접 세어 봐야 하지만 '일만 일천이백이십이 원' 은 그냥 읽힌다.
   */
  const koreanAmount = toKoreanMoney(amountNumber)

  /** 한도 안에 든 값. 테두리 하나로는 약해서 바깥으로 빛이 번지게 한다 */
  const amountValid = amountNumber !== null && !amountError

  const amountLabelId = useId()
  const amountMessageId = `${amountLabelId}-message`

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
          <h2 id={amountLabelId} className="text-body2 text-text-secondary mb-3 font-semibold">
            신청 금액
          </h2>

          {/*
           * 공용 Input 을 쓰지 않고 칸을 직접 짠다.
           *
           * 한 줄 안에 값·한글 병기·단위·보조 버튼 넷이 들어가는데, Input 의 rightSlot 은
           * 오른쪽 여백을 pr-11 로 고정해 둔 자리라 이만큼을 비워 주지 못한다. 폭을 px 로
           * 어림잡아 밀어 넣을 수도 있지만, flex 로 짜면 버튼 글자가 바뀌어도 자리가
           * 알아서 남는다. 테두리·포커스 색은 Input 과 같은 토큰을 쓴다.
           */}
          <div
            /*
             * 판정을 테두리 색과 바깥으로 번지는 빛으로 알린다.
             *
             * 1px 테두리만으로는 초록과 회색이 잘 구분되지 않는다 — 특히 큰 화면에서
             * 칸이 가로로 길면 테두리가 실처럼 보인다. 빛이 번지면 색을 비교하지 않아도
             * 상태가 바뀐 것이 눈에 들어온다 (index.css 의 --shadow-glow-*).
             *
             * 포커스가 아니라 값으로 가른다. 금액을 다 치고 계좌 선택으로 넘어간 뒤에도
             * 이 값이 한도 안이었는지 다시 확인할 수 있어야 한다.
             */
            className={cn(
              'bg-surface flex h-12 items-center gap-2 rounded-sm border px-4 transition',
              amountError && 'border-danger shadow-glow-danger',
              amountValid && 'border-primary shadow-glow-primary',
              !amountError && !amountValid && 'border-border-strong focus-within:border-primary',
            )}
          >
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <input
                // 콤마를 보여줘야 해서 type=number 를 쓰지 않는다. 자판만 숫자로 띄운다
                inputMode="numeric"
                value={withComma(amount)}
                onChange={(event) => onAmountChange(event.target.value.replace(/\D/g, ''))}
                placeholder="0"
                aria-labelledby={amountLabelId}
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountMessageId}
                className="text-h4 text-text placeholder:text-text-disabled w-full bg-transparent tabular-nums outline-none"
              />

              {/*
               * 병기는 입력칸 위에 겹쳐 그린다. 입력값과 똑같은 글자를 보이지 않게 먼저
               * 깔아 그 폭만큼 밀린 자리에서 시작하므로, 글자 수가 바뀌어도 숫자 바로
               * 옆에 붙는다. 폭을 재는 코드가 없으니 렌더 중에 DOM 을 건드릴 일도 없다.
               *
               * 낭독기에는 감춘다. 입력값을 이미 읽어 주므로 같은 금액을 두 번 듣게 된다.
               */}
              {koreanAmount && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap"
                >
                  <span className="text-h4 invisible tabular-nums">{withComma(amount)}</span>
                  <span className="text-body2 text-text-muted ml-2">{koreanAmount}</span>
                </span>
              )}
            </div>

            {range && (
              <>
                <QuickButton onClick={() => onAmountChange(String(range.min))}>최소</QuickButton>
                <QuickButton onClick={() => onAmountChange(String(range.max))}>최대</QuickButton>
              </>
            )}
            <QuickButton onClick={() => onAmountChange('')} disabled={amount === ''}>
              지우기
            </QuickButton>
          </div>

          <p
            id={amountMessageId}
            className={cn('text-caption mt-1.5', amountError ? 'text-danger' : 'text-text-muted')}
          >
            {amountError ?? rangeText}
          </p>
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
