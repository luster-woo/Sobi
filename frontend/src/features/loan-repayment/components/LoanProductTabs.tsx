import { maskAccountNo } from '@/features/loan-repayment/model/format'
import type { LoanProduct } from '@/features/loan-repayment/model/types'
import { cn } from '@/shared/utils/cn'

interface LoanProductTabsProps {
  products: LoanProduct[]
  selectedAccountNo: string
  onSelect: (accountNo: string) => void
}

/**
 * 대출 상품 탭.
 *
 * 상품이 하나여도 탭을 그린다. 개수에 따라 제목이 됐다 탭이 됐다 하면 같은 화면이
 * 사람마다 다르게 보이고, 완납으로 2개가 1개가 되는 순간 레이아웃이 튄다.
 *
 * 시안의 'LN-2026-0000517' 자리에는 계좌번호 뒷자리를 넣는다. 접수번호가 응답에 없고,
 * 같은 은행에서 상품을 둘 받은 경우 이름만으로는 구분이 안 된다.
 */
export default function LoanProductTabs({
  products,
  selectedAccountNo,
  onSelect,
}: LoanProductTabsProps) {
  return (
    <div role="tablist" aria-label="내 대출 상품" className="flex flex-wrap gap-1">
      {products.map((product) => {
        const selected = product.accountNo === selectedAccountNo

        return (
          <button
            key={product.accountNo}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(product.accountNo)}
            className={cn(
              'focus-visible:outline-primary rounded-md border px-4 py-2.5 text-[13px] transition-colors focus-visible:outline focus-visible:-outline-offset-2',
              // 선택된 탭은 연한 초록 바탕 + 진한 초록 글씨. 둘 다 테두리를 그려야
              // 전환할 때 탭 너비가 흔들리지 않는다
              selected
                ? 'border-primary/25 bg-primary-soft text-primary font-semibold'
                : 'border-border bg-surface text-text-secondary hover:text-text',
            )}
          >
            {product.accountName}
            <span
              className={cn(
                'ml-2 text-[11.5px] tabular-nums',
                selected ? 'text-primary/70' : 'text-text-muted',
              )}
            >
              {maskAccountNo(product.accountNo)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
