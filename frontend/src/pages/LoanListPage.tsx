import { Outlet, useLocation, useNavigate } from 'react-router'

import { loanColumns } from '@/features/loan/components/loanColumns'
import LoanFilterBar from '@/features/loan/components/LoanFilterBar'
import { useLoans } from '@/features/loan/hooks/useLoans'
import type { LoanSort } from '@/features/loan/model/types'
import { LOAN_STATUS, type LoanStatus } from '@/shared/constants/productStatus'
import { routeTo } from '@/shared/constants/routes'
import { useListParams } from '@/shared/hooks/useListParams'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import PageHeading from '@/shared/ui/PageHeading'
import Panel from '@/shared/ui/Panel'
import SearchBar from '@/shared/ui/SearchBar'
import Table from '@/shared/ui/Table'

const FILTER_KEYS = ['keyword', 'status', 'bookmarked', 'sort'] as const

/**
 * 대출 상품 조회 · 검색 (S15P21D101-187 · 188)
 *
 * 검색을 별도 화면으로 만들지 않았다. 시안의 대출 조회 패널 맨 위에 검색창이 있고,
 * 검색어가 있어도 필터·정렬이 그대로 걸린다 — 지원사업의 자연어 검색과 다르다.
 * 그래서 같은 화면·같은 주소에서 keyword 파라미터만 더 붙는다.
 *
 * 필터·검색어는 URL 쿼리스트링에 둔다. 상세를 보고 뒤로 왔을 때 조건이 살아 있어야
 * 하고, "기업은행 · 가능" 을 링크로 공유할 수 있어야 한다.
 *
 * 페이지네이션이 없다. 판정이 사용자마다 달라 서버가 DB 에서 자르지 못하고 전체를
 * 판정한 뒤 메모리에서 거르기 때문이다. 그래서 전체 건수를 보여줄 자리도 사라졌는데,
 * 대신 상태별 개수(statusCounts)가 오므로 그걸 필터 선택지에 붙인다.
 */
export function LoanListPage() {
  const { values, setValues, activeCount, reset } = useListParams({ keys: FILTER_KEYS })
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isLoading, isFetching, isError, refetch } = useLoans({
    keyword: values.keyword || undefined,
    status: (values.status as LoanStatus) || undefined,
    bookmarked: values.bookmarked === 'true' ? true : undefined,
    sort: (values.sort as LoanSort) || undefined,
  })

  const keyword = values.keyword
  const loans = data?.loans ?? []

  /*
   * loans 는 서버가 검색어·은행·판정·즐겨찾기를 모두 적용한 결과다. 그래서 줄 수를
   * 그대로 세면 어떤 필터를 걸든 맞는 값이 나온다 — 필터마다 개수를 따로 받을 필요가 없다.
   *
   * totalCount 는 반대로 필터 적용 전 전체다. 둘을 나란히 보여줘야 "23개 중 7개로
   * 좁혔다" 가 읽힌다. 페이지네이션이 사라지면서 전체 규모를 알려줄 자리가 여기뿐이다.
   */
  const shownCount = loans.length
  const totalCount = data?.totalCount ?? 0
  const filtered = Boolean(values.keyword || values.status || values.bookmarked === 'true')

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
      <PageHeading title="대출" />

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
          status={values.status}
          bookmarked={values.bookmarked === 'true'}
          sort={values.sort}
          onChange={setValues}
          activeCount={activeCount}
          onReset={reset}
        />

        {/*
          검색어를 따로 짚지 않는다. 검색창에 그대로 남아 있고 빈 결과 안내에도 나오는데,
          여기서 또 반복하면 정작 알아야 할 '몇 개로 좁혀졌는지' 가 묻힌다.
        */}
        <p className="text-body2 text-text-secondary px-4 py-3">
          {filtered ? (
            <>
              전체 {totalCount}개 중 <span className="text-text font-semibold">{shownCount}</span>개
              상품
            </>
          ) : (
            <>
              내 사업체 기준 · 전체 <span className="text-text font-semibold">{totalCount}</span>개
              상품
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
          // 줄 높이·여백을 관심 목록과 같게 한다
          dense
          /*
           * 자격이 안 되는 줄은 눌러도 신청할 수 없다. 흐리게 두어 먼저 걸러 보게 한다 —
           * 관심 목록과 같은 처리다.
           */
          rowClassName={(loan) =>
            loan.status === LOAN_STATUS.INELIGIBLE ? 'bg-surface-muted' : undefined
          }
          empty={
            isError ? (
              <EmptyState
                title="목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해주세요."
                action={
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    다시 시도
                  </Button>
                }
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
      </Panel>

      {/* /loans/:loanId — 상품 상세 모달이 이 자리에 렌더된다 */}
      <Outlet />
    </div>
  )
}
