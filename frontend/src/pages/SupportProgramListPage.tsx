import { supportColumns } from '@/features/support-program/components/supportColumns'
import SupportFilterBar from '@/features/support-program/components/SupportFilterBar'
import { useSupportPrograms } from '@/features/support-program/hooks/useSupportPrograms'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { useListParams } from '@/shared/hooks/useListParams'
import type { SupportProgramType } from '@/shared/types'
import EmptyState from '@/shared/ui/EmptyState'
import Pagination from '@/shared/ui/Pagination'
import Panel from '@/shared/ui/Panel'
import Table from '@/shared/ui/Table'
import { toServerPage } from '@/shared/utils/pagination'

const FILTER_KEYS = ['type', 'jrsdInsttNm', 'judgement', 'isBookmark', 'sort'] as const
const PAGE_SIZE = 20

/**
 * 지원 사업 조회 (S15P21D101-192)
 *
 * 필터·정렬·페이지는 URL 쿼리스트링에 둔다. 상세를 보고 뒤로 왔을 때 조건이 살아
 * 있어야 하고, 링크로 공유할 수 있어야 한다.
 *
 * 검색은 193에서 붙인다. 지원사업 검색은 POST /api/v1/support/search 로 자연어 검색이고
 * 필터 파라미터를 받지 않아서, 대출처럼 같은 화면에 검색창만 얹는 구조가 아니다 —
 * 검색 모드와 필터 모드를 갈라야 한다.
 */
export function SupportProgramListPage() {
  const { page, values, setPage, setValues } = useListParams({ keys: FILTER_KEYS })

  const { data, isLoading, isError } = useSupportPrograms({
    page: toServerPage(page),
    size: PAGE_SIZE,
    type: (values.type as SupportProgramType) || undefined,
    jrsdInsttNm: values.jrsdInsttNm || undefined,
    judgement: (values.judgement as ProductStatus) || undefined,
    isBookmark: values.isBookmark === 'true' ? true : undefined,
    sort: values.sort || undefined,
  })

  const programs = data?.programs ?? []
  const totalElements = data?.page.totalElements ?? 0
  const totalPages = data?.page.totalPages ?? 0

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4">
      <h1 className="text-h1">지원사업</h1>

      <Panel>
        <SupportFilterBar
          type={values.type}
          jrsdInsttNm={values.jrsdInsttNm}
          judgement={values.judgement}
          isBookmark={values.isBookmark === 'true'}
          sort={values.sort}
          onChange={setValues}
        />

        <p className="text-body2 text-text-secondary px-4 py-3">
          내 자격 기준 · 전체 <span className="text-text font-semibold">{totalElements}</span>건
        </p>

        <Table
          caption="지원사업 목록"
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