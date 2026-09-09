import { loanColumns } from '@/features/loan/components/loanColumns'
import LoanFilterBar from '@/features/loan/components/LoanFilterBar'
import { useLoans } from '@/features/loan/hooks/useLoans'
import { useListParams } from '@/shared/hooks/useListParams'
import EmptyState from '@/shared/ui/EmptyState'
import Pagination from '@/shared/ui/Pagination'
import Panel from '@/shared/ui/Panel'
import Table from '@/shared/ui/Table'
import { toServerPage } from '@/shared/utils/pagination'

const FILTER_KEYS = ['bankName', 'isPossible', 'isBookmark', 'sort'] as const
const PAGE_SIZE = 20

/**
 * 대출 상품 조회 (S15P21D101-187)
 *
 * 필터·정렬·페이지는 URL 쿼리스트링에 둡니다. 상세를 보고 뒤로 왔을 때 조건이
 * 살아 있어야 하고, "기업은행 3페이지" 를 링크로 공유할 수 있어야 합니다.
 *
 * 검색창은 188에서 붙입니다 — 검색 파라미터 이름이 명세에 없어서, UI 만 만들면
 * 눌러도 결과가 바뀌지 않습니다.
 */
export function LoanListPage() {
  const { page, values, setPage, setValues } = useListParams({ keys: FILTER_KEYS })

  const { data, isLoading, isError } = useLoans({
    page: toServerPage(page),
    size: PAGE_SIZE,
    bankName: values.bankName || undefined,
    isPossible: values.isPossible === 'true' ? true : undefined,
    isBookmark: values.isBookmark === 'true' ? true : undefined,
    sort: values.sort || undefined,
  })

  const loans = data?.loans ?? []
  const totalElements = data?.page.totalElements ?? 0
  const totalPages = data?.page.totalPages ?? 0

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
      <h1 className="text-h1">대출</h1>

      <Panel>
        <LoanFilterBar
          bankName={values.bankName}
          isPossible={values.isPossible === 'true'}
          isBookmark={values.isBookmark === 'true'}
          sort={values.sort}
          onChange={setValues}
        />

        <p className="text-body2 text-text-secondary px-4 py-3">
          내 사업체 기준 · 전체 <span className="text-text font-semibold">{totalElements}</span>개
          상품
        </p>

        <Table
          caption="대출 상품 목록"
          columns={loanColumns}
          rows={loans}
          getRowId={(loan) => loan.loanId}
          isLoading={isLoading}
          skeletonRows={8}
          bordered={false}
          empty={
            isError ? (
              <EmptyState
                title="목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해주세요."
              />
            ) : (
              <EmptyState
                title="조건에 맞는 상품이 없어요"
                description="필터를 넓혀서 다시 찾아보세요."
              />
            )
          }
        />

        {totalPages > 1 && (
          <div className="border-border-subtle border-t px-4 py-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>
    </div>
  )
}
