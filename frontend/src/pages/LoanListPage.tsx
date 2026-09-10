import { Outlet, useLocation, useNavigate } from 'react-router'

import { loanColumns } from '@/features/loan/components/loanColumns'
import LoanFilterBar from '@/features/loan/components/LoanFilterBar'
import { useLoans } from '@/features/loan/hooks/useLoans'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { routeTo } from '@/shared/constants/routes'
import { useListParams } from '@/shared/hooks/useListParams'
import EmptyState from '@/shared/ui/EmptyState'
import Pagination from '@/shared/ui/Pagination'
import Panel from '@/shared/ui/Panel'
import SearchBar from '@/shared/ui/SearchBar'
import Table from '@/shared/ui/Table'
import { toServerPage } from '@/shared/utils/pagination'

const FILTER_KEYS = ['keyword', 'bankName', 'judgement', 'isBookmark', 'sort'] as const
const PAGE_SIZE = 20

/**
 * 대출 상품 조회 · 검색 (S15P21D101-187 · 188)
 *
 * 검색을 별도 화면으로 만들지 않았다. 시안의 대출 조회 패널 맨 위에 검색창이 있고,
 * 검색어가 있어도 필터·정렬이 그대로 걸린다 — 지원사업의 자연어 검색과 다르다.
 * 그래서 같은 화면·같은 주소에서 keyword 파라미터만 더 붙는다.
 *
 * 필터·검색어·페이지는 URL 쿼리스트링에 둔다. 상세를 보고 뒤로 왔을 때 조건이
 * 살아 있어야 하고, "기업은행 3페이지" 를 링크로 공유할 수 있어야 한다.
 */
export function LoanListPage() {
  const { page, values, setPage, setValues } = useListParams({ keys: FILTER_KEYS })
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isLoading, isFetching, isError } = useLoans({
    page: toServerPage(page),
    size: PAGE_SIZE,
    keyword: values.keyword || undefined,
    bankName: values.bankName || undefined,
    judgement: (values.judgement as ProductStatus) || undefined,
    isBookmark: values.isBookmark === 'true' ? true : undefined,
    sort: values.sort || undefined,
  })

  const keyword = values.keyword
  const loans = data?.loans ?? []
  const totalElements = data?.page.totalElements ?? 0
  const totalPages = data?.page.totalPages ?? 0

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
      <h1 className="text-h1">대출</h1>

      <Panel>
        <div className="px-4 pt-4">
          <SearchBar
            value={keyword}
            // 빈 문자열이면 null 로 넘겨 URL 에서 키를 지운다. page 리셋은 useListParams 가 한다
            onSubmit={(next) => setValues({ keyword: next || null })}
            placeholder="상품명·취급 기관으로 찾기"
            /*
             * 검색·필터·정렬 어떤 요청이든 진행 중이면 버튼에 스피너가 돈다.
             * 검색만 구분하려면 조건을 더 붙여야 하는데, 어차피 같은 목록을 다시
             * 받아오는 중이라 사용자에게는 같은 의미다.
             */
            isSearching={isFetching}
          />
        </div>

        <LoanFilterBar
          bankName={values.bankName}
          judgement={values.judgement}
          isBookmark={values.isBookmark === 'true'}
          sort={values.sort}
          onChange={setValues}
        />

        <p className="text-body2 text-text-secondary px-4 py-3">
          {keyword ? (
            <>
              <span className="text-text font-semibold">‘{keyword}’</span> 검색 결과{' '}
              <span className="text-text font-semibold">{totalElements}</span>건
            </>
          ) : (
            <>
              내 사업체 기준 · 전체 <span className="text-text font-semibold">{totalElements}</span>
              개 상품
            </>
          )}
        </p>

        <Table
          caption="대출 상품 목록"
          columns={loanColumns}
          rows={loans}
          getRowId={(loan) => loan.loanId}
          // 검색어·필터를 들고 이동한다. 모달을 닫으면 그대로 돌아온다
          onRowClick={(loan) =>
            navigate({ pathname: routeTo.loanDetail(loan.loanId), search: location.search })
          }
          isLoading={isLoading}
          skeletonRows={8}
          bordered={false}
          empty={
            isError ? (
              <EmptyState
                title="목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해주세요."
              />
            ) : keyword ? (
              <EmptyState
                title={`‘${keyword}’ 와 맞는 상품이 없어요`}
                description="다른 키워드로 검색하거나 필터를 넓혀보세요."
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

      {/* /loans/:loanId — 상품 상세 모달이 이 자리에 렌더된다 */}
      <Outlet />
    </div>
  )
}
