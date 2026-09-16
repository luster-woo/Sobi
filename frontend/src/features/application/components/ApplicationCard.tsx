import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { formatApplicationDate } from '@/features/application/model/date'
import { applicationStatusLabel } from '@/features/application/model/statusLabel'
import type { ApplicationListItem } from '@/features/application/model/types'
import { routeTo } from '@/shared/constants/routes'
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
 *
 * 준비중인 건에만 '이어서 작성' 을 둔다. 서류를 올리다 중단한 신청서로 돌아갈 길이
 * 여기 말고는 없다 — 상품 목록에서 다시 신청하면 중복이 된다.
 *
 * 펼치지 않아도 보이게 한 이유는 준비중 카드를 펼쳐 봐야 소득이 없기 때문이다.
 * 스텝퍼가 4단계 중 0단계라 전부 회색이다. 할 일이 남은 카드에서 두 번 눌러야
 * 그 일에 닿는 건 앞뒤가 바뀐 것이다.
 */
export default function ApplicationCard({
  application,
  onToggle,
  expanded,
  children,
}: ApplicationCardProps) {
  const navigate = useNavigate()
  const { applicationId, type, status, programName, amount, subjectAt, rejectReason } = application

  /*
   * 신청 화면은 대출·지원사업이 경로만 다르고 화면은 같다. 여기서 가르는 이유는
   * 그 화면이 '목록으로' 링크를 그릴 때 경로로 출처를 판단하기 때문이다.
   */
  const continueTo =
    type === 'LOAN' ? routeTo.loanApply(applicationId) : routeTo.supportProgramApply(applicationId)

  /*
   * 상품·공고가 지워지면 type 과 programName 이 없다(FK 가 ON DELETE SET NULL).
   * 신청 기록 자체는 남아 있어 진행 상황은 볼 수 있어야 하므로 카드를 숨기지 않고
   * 이름 자리만 메운다. 종류를 모르면 '대출'·'지원금' 줄은 아예 뺀다 — 둘 중 하나로
   * 찍으면 틀린 정보가 된다.
   */
  const meta = [
    type === null ? null : type === 'LOAN' ? '대출' : '지원금',
    amount !== null ? `${formatMoneyShort(amount)} 신청` : null,
    `${formatApplicationDate(subjectAt)} 접수`,
  ].filter(Boolean)

  /*
   * 프레임은 Panel 을 그대로 쓴다. 같은 클래스를 손으로 적어 두면
   * 디자인 토큰이 바뀔 때 한쪽만 안 따라간다.
   */
  return (
    <Panel>
      {/* items-center 다. 상품명이 두 줄로 넘어가도 배지·버튼이 글 블록 한가운데 선다 */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-[200px] flex-1">
          <p className="text-body1 text-text font-semibold break-keep">
            {programName ?? '삭제된 상품'}
          </p>
          <p className="text-body2 text-text-secondary mt-1">{meta.join(' · ')}</p>
        </div>

        {/*
          배지와 버튼 폭을 고정한다. 문구 길이가 '승인' 2자에서 '신청 준비중' 6자까지
          벌어져서, 폭을 내용에 맡기면 카드마다 열이 어긋나 목록이 들쭉날쭉해진다.

          버튼은 상태당 하나씩만 둔다. 준비중 카드에 '진행 사항 보기' 를 같이 두지 않는
          이유는 펼쳐 봐야 소득이 없어서다 — 스텝퍼가 4단계 중 0단계라 전부 회색이다.
          할 일이 남은 카드에서 버튼 두 개 중 하나를 고르게 할 이유가 없다.
        */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={APPLICATION_STATUS_VARIANT[status]} className="w-[92px] justify-center">
            {applicationStatusLabel(status, type)}
          </Badge>

          {status === 'PREPARING' ? (
            <Button size="sm" className="w-[110px]" onClick={() => navigate(continueTo)}>
              이어서 작성
            </Button>
          ) : (
            /* '보기'·'닫기' 가 같은 글자 수라 여닫아도 폭이 변하지 않는다 */
            <Button variant="outline" size="sm" className="w-[110px]" onClick={onToggle}>
              진행 사항 {expanded ? '닫기' : '보기'}
            </Button>
          )}
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
