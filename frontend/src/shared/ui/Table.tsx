import type { KeyboardEvent, ReactNode } from 'react'

import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

export interface Column<T> {
  /** React key 로만 쓰인다. 화면에 보이지 않는 식별자 */
  key: string
  header: ReactNode
  /** 셀 내용. 날짜·금액 포맷팅도 여기서 한다 */
  render: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  /** '120px' · '20%' 등 CSS width. 안 주면 내용에 맞춰 늘어난다 */
  width?: string
}

interface TableProps<T> {
  /**
   * 표가 무엇의 목록인지. 화면에는 안 보이고 스크린리더만 읽는다.
   * 필수로 둔 이유: 옵션으로 두면 아무도 안 넣어서 표가 정체불명이 된다.
   */
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  isLoading?: boolean
  /** 로딩 중 그릴 스켈레톤 행 수. 보통 페이지 크기(size)와 맞춘다 */
  skeletonRows?: number
  /** rows 가 비었을 때 그릴 것. 안 주면 기본 문구가 나간다 */
  empty?: ReactNode
  /** 행마다 다른 클래스. 기본 클래스와 겹치면 이쪽이 이긴다 (상권 비교표의 조회한 행정동) */
  rowClassName?: (row: T) => string | undefined
  onRowClick?: (row: T) => void
  /**
   * 자기 테두리를 그릴지. 검색창과 표가 하나의 흰 프레임 안에 들어가는 화면에서는
   * false 로 둔다 — 표가 테두리를 또 그리면 두 겹이 된다.
   */
  bordered?: boolean
  /**
   * 행 높이를 관심 목록(FavoritesPage)과 같게 한다 — 셀 여백이 `px-4 py-3` 대신
   * `px-[15px] py-2.5` 가 된다.
   *
   * 기본값으로 만들지 않은 이유: 상권 비교표·상환 기록표는 지금 밀도가 맞고, 공용
   * 컴포넌트에서 기본을 바꾸면 손대지 않은 화면의 줄 높이가 같이 움직인다.
   * 자금 상품 목록(대출·지원사업)만 켠다.
   */
  dense?: boolean
  className?: string
}

const alignClass: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * 서버 페이징 목록용 표.
 *
 * 로딩·0건·데이터 세 상태를 여기서 처리한다. isLoading 이면 헤더를 유지한 채
 * 스켈레톤 행을 그려서, 데이터가 들어올 때 레이아웃이 튀지 않게 한다.
 *
 * ⚠️ isLoading 과 rows.length === 0 이 겹칠 때 EmptyState 를 먼저 그리면
 *    "데이터 없음"이 깜빡였다가 목록이 나타난다. 그래서 로딩을 먼저 검사한다.
 *
 * onRowClick 은 편의용이다. 행 전체가 상세로 가는 링크라면 첫 열에 Link 를 넣는
 * 편이 접근성·새 탭 열기 면에서 낫다.
 */
export default function Table<T>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  skeletonRows = 5,
  empty,
  rowClassName,
  onRowClick,
  bordered = true,
  dense = false,
  className,
}: TableProps<T>) {
  const isClickable = Boolean(onRowClick)
  // 헤더와 본문이 같은 값을 써야 열이 어긋나지 않는다
  const cellPadding = dense ? 'px-[15px] py-2.5' : 'px-4 py-3'

  const handleKeyDown = (row: T) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onRowClick) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    // 스페이스는 기본 동작이 스크롤이라 막아야 한다
    event.preventDefault()
    onRowClick(row)
  }

  return (
    <div
      className={cn(
        'overflow-x-auto',
        bordered && 'border-border bg-surface rounded-md border',
        className,
      )}
    >
      <table aria-busy={isLoading || undefined} className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>

        <thead>
          <tr className="border-border bg-surface-muted border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{ width: column.width }}
                className={cn(
                  'text-caption text-text-secondary font-semibold whitespace-nowrap',
                  cellPadding,
                  alignClass[column.align ?? 'left'],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading &&
            Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="border-border-subtle border-b">
                {columns.map((column) => (
                  <td key={column.key} className={cellPadding}>
                    <Skeleton variant="text" width="70%" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {empty ?? (
                  <EmptyState
                    title="표시할 내용이 없어요"
                    description="조건을 바꿔서 다시 찾아보세요."
                  />
                )}
              </td>
            </tr>
          )}

          {!isLoading &&
            rows.map((row) => (
              <tr
                key={getRowId(row)}
                tabIndex={isClickable ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={isClickable ? handleKeyDown(row) : undefined}
                className={cn(
                  'border-border-subtle border-b last:border-b-0',
                  isClickable &&
                    'hover:bg-surface-muted focus-visible:outline-primary cursor-pointer focus-visible:outline focus-visible:-outline-offset-2',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('text-body2', cellPadding, alignClass[column.align ?? 'left'])}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
