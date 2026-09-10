import { supportColumns } from '@/features/support-program/components/supportColumns'
import SupportFilterBar from '@/features/support-program/components/SupportFilterBar'
import { useSupportPrograms } from '@/features/support-program/hooks/useSupportPrograms'
import { useSupportProgramSearch } from '@/features/support-program/hooks/useSupportProgramSearch'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { useListParams } from '@/shared/hooks/useListParams'
import type { SupportProgramType } from '@/shared/types'
import EmptyState from '@/shared/ui/EmptyState'
import Pagination from '@/shared/ui/Pagination'
import Panel from '@/shared/ui/Panel'
import SearchBar from '@/shared/ui/SearchBar'
import Table from '@/shared/ui/Table'
import { toServerPage } from '@/shared/utils/pagination'

const FILTER_KEYS = ['q', 'type', 'jrsdInsttNm', 'judgement', 'isBookmark', 'sort'] as const
const PAGE_SIZE = 20

/**
 * 지원 사업 조회 · 검색 (S15P21D101-192 · 193)
 *
 * 검색 모드와 필터 모드가 배타적이다. 자연어 검색(POST /support/search)은 page·size 만
 * 받고 필터 파라미터를 받지 않는다. 필터를 걸어둔 채 검색하면 화면에는 필터가 걸린 것처럼
 * 보이는데 결과에는 안 걸린다 — 조용히 무시되는 게 제일 나쁘다.
 *
 * 그래서 검색어가 생기면 URL 에서 필터 키를 전부 지우고 필터 바도 숨긴다.
 * 대출(188)은 keyword 가 필터와 같이 걸려서 같은 화면에 검색창만 얹었다 — 다른 구조다.
 */
export function SupportProgramListPage() {
  const { page, values, setPage, setValues } = useListParams({ keys: FILTER_KEYS })

  const q = values.q
  const isSearchMode = Boolean(q)

  const listQuery = useSupportPrograms(
    {
      page: toServerPage(page),
      size: PAGE_SIZE,
      type: (values.type as SupportProgramType) || undefined,
      jrsdInsttNm: values.jrsdInsttNm || undefined,
      judgement: (values.judgement as ProductStatus) || undefined,
      isBookmark: values.isBookmark === 'true' ? true : undefined,
      sort: values.sort || undefined,
    },
    { enabled: !isSearchMode },
  )

  const searchQuery = useSupportProgramSearch(
    { page: toServerPage(page), size: PAGE_SIZE, query: q },
    { enabled: isSearchMode },
  )

  // 훅은 조건부로 호출할 수 없어 둘 다 부르고 enabled 로 하나만 켠다
  const { data, isLoading, isFetching, isError } = isSearchMode ? searchQuery : listQuery

  const programs = data?.programs ?? []
  const totalElements = data?.page.totalElements ?? 0
  const totalPages = data?.page.totalPages ?? 0

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
      <h1 className="text-h1">지원사업</h1>

      <Panel>
        <div className="px-4 pt-4">
          <SearchBar
            value={q}
            onSubmit={(keyword) =>
              setValues({
                q: keyword || null,
                // 검색 모드로 들어가면 필터를 함께 지운다 (위 주석 참고)
                type: null,
                jrsdInsttNm: null,
                judgement: null,
                isBookmark: null,
                sort: null,
              })
            }
            placeholder="어떤 지원금이 필요하세요? 예: 키오스크 도입 비용"
            isSearching={isFetching}
          />
        </div>

        {!isSearchMode && (
          <SupportFilterBar
            type={values.type}
            jrsdInsttNm={values.jrsdInsttNm}
            judgement={values.judgement}
            isBookmark={values.isBookmark === 'true'}
            sort={values.sort}
            onChange={setValues}
          />
        )}

        <div className="px-4 py-3">
          {isSearchMode ? (
            <>
              <p className="text-body2 text-text-secondary">
                <span className="text-text font-semibold">‘{q}’</span> 검색 결과{' '}
                <span className="text-text font-semibold">{totalElements}</span>건
              </p>
              <p className="text-caption text-text-muted mt-1">
                자연어로 찾은 결과예요 · 판정은 내 자격 기준 · 검색 중에는 필터가 적용되지 않습니다
              </p>
            </>
          ) : (
            <p className="text-body2 text-text-secondary">
              내 자격 기준 · 전체 <span className="text-text font-semibold">{totalElements}</span>건
            </p>
          )}
        </div>

        <Table
          caption={isSearchMode ? '지원사업 검색 결과' : '지원사업 목록'}
          columns={supportColumns}
          rows={programs}
          getRowId={(program) => program.supportProgramId}
          isLoading={isLoading}
          skeletonRows={8}
          bordered={false}
          empty={
            isError ? (
              <EmptyState
                title="목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해주세요."
              />
            ) : isSearchMode ? (
              <EmptyState
                title={`‘${q}’ 와 맞는 공고가 없어요`}
                description="다른 표현으로 물어보시거나, 검색을 해제하고 필터로 찾아보세요."
              />
            ) : (
              <EmptyState
                title="조건에 맞는 공고가 없어요"
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
