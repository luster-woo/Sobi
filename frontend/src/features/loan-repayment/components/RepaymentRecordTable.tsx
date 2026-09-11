import { useState } from 'react'

import { formatDotDate, formatWonText } from '@/features/loan-repayment/model/format'
import { countLeadingSuccess, isSuccessRecord } from '@/features/loan-repayment/model/records'
import type { RepaymentRecord } from '@/features/loan-repayment/model/types'
import Badge from '@/shared/ui/Badge'
import Pagination from '@/shared/ui/Pagination'
import Panel from '@/shared/ui/Panel'
import type { Column } from '@/shared/ui/Table'
import Table from '@/shared/ui/Table'

interface RepaymentRecordTableProps {
  records: RepaymentRecord[]
}

/**
 * 한 페이지에 몇 회차를 보여줄지.
 *
 * 금융망이 매일 한 회차씩 상환해서 1년 대출이면 365행이 된다. 서버 응답에 페이징이
 * 없어 한 번에 다 오므로 여기서 잘라 보여준다. 데이터가 이미 손에 있어 페이지를
 * 넘겨도 요청이 나가지 않는다.
 */
const PAGE_SIZE = 10

/**
 * 자동 이체 기록.
 *
 * 시안의 '상품' 열을 뺐다. 탭에서 고른 상품 하나의 기록이라 모든 행이 같은 값이다.
 * 대신 회차 번호를 넣었다 — 몇 번째 출금인지가 훨씬 쓸모 있다.
 *
 * 출금일은 실제 출금일(actualDate)을 쓰되, 실패해서 없으면 시도일(attemptDate)을
 * 보여주고 옆에 실패 사유를 붙인다. 실패한 날도 사용자에게는 "그날 뭔가 있었다" 는
 * 정보다.
 */
export default function RepaymentRecordTable({ records }: RepaymentRecordTableProps) {
  const [page, setPage] = useState(1)

  // 탭을 바꾸면 기록이 통째로 바뀐다. 3페이지를 보던 중 2페이지짜리 상품으로 넘어가면
  // 빈 표가 되므로 1페이지로 되돌린다. effect 로 하면 한 프레임 빈 표가 지나간다
  const [lastRecords, setLastRecords] = useState(records)
  if (records !== lastRecords) {
    setLastRecords(records)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const rows = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const leadingSuccess = countLeadingSuccess(records)

  const columns: Column<RepaymentRecord>[] = [
    {
      key: 'installmentNumber',
      header: '회차',
      // 열이 4개뿐이라 너비를 안 주면 '출금일' 이 남는 공간을 다 먹고 금액·상태가
      // 오른쪽 끝으로 밀려 가운데가 텅 빈다. 비율로 고르게 나눈다
      width: '14%',
      render: (row) => `${row.installmentNumber}회`,
    },
    {
      key: 'date',
      header: '출금일',
      width: '32%',
      render: (row) => formatDotDate(row.actualDate ?? row.attemptDate),
    },
    {
      key: 'paymentBalance',
      header: '금액',
      align: 'right',
      width: '26%',
      render: (row) => formatWonText(row.paymentBalance),
    },
    {
      key: 'status',
      header: '상태',
      align: 'right',
      width: '28%',
      render: (row) =>
        isSuccessRecord(row) ? (
          <Badge variant="success">정상 출금</Badge>
        ) : (
          <span className="inline-flex flex-col items-end gap-1">
            <Badge variant="danger">출금 실패</Badge>
            {row.failureReason && (
              <span className="text-caption text-text-muted">{row.failureReason}</span>
            )}
          </span>
        ),
    },
  ]

  return (
    <Panel
      title="자동 이체 기록"
      headerRight={
        <span className="text-text-muted text-[11.5px] tabular-nums">
          {leadingSuccess > 0 ? `최근 ${leadingSuccess}회 정상 출금` : `전체 ${records.length}회`}
        </span>
      }
    >
      <Table
        caption="대출 자동 이체 기록"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.installmentNumber}
        // 패널이 이미 테두리를 그렸다. 표가 또 그리면 두 겹이 된다
        bordered={false}
        empty={
          <p className="text-body2 text-text-secondary px-4 py-10 text-center">
            아직 출금된 기록이 없어요. 첫 상환일에 자동으로 빠져나갑니다.
          </p>
        }
      />

      {/* 한 페이지에 다 들어가면 페이지네이션을 그리지 않는다 */}
      {totalPages > 1 && (
        <div className="border-border-subtle flex justify-center border-t py-3">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </Panel>
  )
}
