import type { ReactNode } from 'react'

import { formatApplicationDate } from '@/features/application/model/date'
import { applicationStatusLabel } from '@/features/application/model/statusLabel'
import type { ApplicationListItem } from '@/features/application/model/types'
import { APPLICATION_STATUS_VARIANT } from '@/shared/constants/statusBadge'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Panel from '@/shared/ui/Panel'
import { formatMoneyShort } from '@/shared/utils/formatters'

interface ApplicationCardProps {
  application: ApplicationListItem
  /** '진행 사항 보기' 를 눌렀을 때. 아코디언 여닫기는 부르는 쪽이 들고 있다 */
  onToggle: () => void
  expanded: boolean
  /** 펼쳤을 때 아래에 들어갈 내용. 174 에서 스텝퍼가 여기로 들어온다 */
  children?: ReactNode
}

/**
 * 신청 한 건.
 *
 * 접수번호는 넣지 않았다. 시안에 있지만 DB 에 컬럼이 없고, 기관에서 받아올 경로도
 * 없어서 넣으면 우리가 지어낸 번호가 된다. 컬럼이 생기면 부제 줄에 붙이면 된다.
 */
export default function ApplicationCard({
  application,
  onToggle,
  expanded,
  children,
}: ApplicationCardProps) {
  const { sourceType, status, productName, organization, applyAmount, subjectAt, rejectReason } =
    application

  const meta = [
    sourceType === 'LOAN' ? '대출' : '지원금',
    applyAmount !== null ? `${formatMoneyShort(applyAmount)} 신청` : null,
    `${formatApplicationDate(subjectAt)} 접수`,
  ].filter(Boolean)

  /*
   * 프레임은 Panel 을 그대로 쓴다. 같은 클래스를 손으로 적어 두면
   * 디자인 토큰이 바뀔 때 한쪽만 안 따라간다.
   */
  return (
    <Panel>
      <div className="flex flex-wrap items-start gap-3 px-5 py-4">
        <div className="min-w-[200px] flex-1">
          <p className="text-body1 text-text font-semibold break-keep">{productName}</p>
          <p className="text-body2 text-text-secondary mt-1">
            {meta.join(' · ')}
            {organization && ` · ${organization}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/*
            카드마다 배지 폭이 달라지면 목록이 들쭉날쭉해 보인다. 가장 긴 문구('실행 완료')
            기준으로 최소 폭을 주고 가운데 정렬한다. min-w 라서 더 긴 문구가 와도 잘리지 않는다.
          */}
          <Badge
            variant={APPLICATION_STATUS_VARIANT[status]}
            className="min-w-[72px] justify-center"
          >
            {applicationStatusLabel(status, sourceType)}
          </Badge>
          <Button variant="outline" size="sm" onClick={onToggle}>
            진행 사항 {expanded ? '닫기' : '보기'}
          </Button>
        </div>
      </div>

      {expanded && children && (
        <div className="border-border-subtle border-t px-5 py-4">{children}</div>
      )}

      {/* 반려 사유는 펼치지 않아도 보여야 한다. 사용자가 지금 알아야 하는 정보다 */}
      {rejectReason && (
        <div className="border-border-subtle bg-surface-alt flex flex-wrap items-center gap-3 border-t px-5 py-3">
          <p className="text-body2 text-text-secondary min-w-[200px] flex-1 break-keep">
            {rejectReason}
          </p>
        </div>
      )}
    </Panel>
  )
}
