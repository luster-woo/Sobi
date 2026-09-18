import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { useCreateApplication } from '@/features/application/hooks/useApplication'
import { startApplicationErrorMessage } from '@/features/application/model/applicationError'
import { APPLICATION_SOURCE } from '@/features/application/model/types'
import { useLoanDetail } from '@/features/loan/hooks/useLoanDetail'
import { describeConditions } from '@/features/loan/model/conditions'
import type { LoanStatus } from '@/shared/constants/productStatus'
import { canApply, LOAN_STATUS_LABEL } from '@/shared/constants/productStatus'
import { ROUTES, routeTo } from '@/shared/constants/routes'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { BOOKMARK_TARGET } from '@/shared/types'
import BookmarkToggle from '@/shared/ui/BookmarkToggle'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 상태별 하단 버튼 문구와 갈 곳.
 *
 *   ELIGIBLE    신청하기            → 189 대출 신청·서류 제출
 *   PREPARING   이어서 작성하기      → 189 (작성 중인 신청을 이어서)
 *   SUBMITTED   신청 내역 보기       → 202 신청 현황
 *   REVIEWING   신청 내역 보기       → 202
 *   APPROVED    신청 내역 보기       → 202
 *   PAID        신청 내역 보기       → 202 (다시 신청할 수 없다)
 *   INELIGIBLE  신청 자격이 안 돼요  → 갈 곳이 없다
 *
 * 신청 완료 시점부터는 신청·서류 제출 화면에 다시 들어갈 수 없다.
 *
 * ELIGIBLE·PREPARING 은 연결됐다. 둘 다 신청 생성을 부르면 되는데, 서버가 준비중인
 * 건이 있으면 새로 만들지 않고 그걸 돌려주기 때문이다.
 *
 * SUBMITTED 이상은 applicationId 로 신청 현황에 보낸다. 그 값이 상태가 신청에서 온
 * 경우에만 오므로, 상태를 다시 나열하지 않고 값이 있는지로 가른다 — 상태가 하나 더
 * 생겨도 여기를 고칠 일이 없다.
 *
 * INELIGIBLE 만 계속 비활성이다. 갈 곳이 없다.
 */
const FOOTER_LABEL: Record<LoanStatus, string> = {
  ELIGIBLE: '신청하기',
  PREPARING: '이어서 작성하기',
  SUBMITTED: '신청 내역 보기',
  REVIEWING: '신청 내역 보기',
  APPROVED: '신청 내역 보기',
  PAID: '신청 내역 보기',
  INELIGIBLE: '신청 자격이 안 돼요',
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border-subtle flex gap-4 border-b py-3 last:border-b-0">
      <dt className="text-body2 text-text-muted w-20 shrink-0">{label}</dt>
      <dd className="text-body2 text-text flex-1">{children}</dd>
    </div>
  )
}

interface LoanDetailModalProps {
  loanId: number
  onClose: () => void
}

/**
 * 대출 상품 상세 모달 (S15P21D101-214)
 *
 * 주소를 모른다. 목록 화면에서는 `/loans/:loanId` 자식 라우트로 떠야 링크 공유와
 * 뒤로가기가 되지만, 대시보드 카드에서는 주소를 바꾸지 않고 그 자리에 떠야 한다.
 * 여는 방법이 둘이라 라우팅을 LoanDetailRoute 로 분리하고 여기는 id 와 닫기만 받는다.
 */
export default function LoanDetailModal({ loanId, onClose }: LoanDetailModalProps) {
  const { data, isLoading, isError } = useLoanDetail(loanId)
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)

  /*
   * ⚠️ features 끼리 불러오는 건 원래 피해야 한다. 여기서 예외를 둔 이유는
   * 이 모달을 여는 곳이 셋(목록 라우트·대시보드 카드·관심 목록)이라 프롭으로 내리면
   * 같은 import 가 셋으로 늘기 때문이다.
   *
   * 194 에서 지원사업도 같은 동작이 필요해지면 그때 shared 로 올리는 게 맞다.
   */
  const createApplication = useCreateApplication()

  const canApplyNow = data ? canApply(data.status) : false
  /*
   * 제출 이후 상태는 그 상품의 신청 건으로 보낸다. applicationId 는 상태가 신청에서
   * 온 경우에만 오므로 값 유무로 가른다.
   */
  const trackedApplicationId = canApplyNow ? null : (data?.applicationId ?? null)

  const handleApply = () => {
    createApplication.mutate(
      { type: APPLICATION_SOURCE.LOAN, programId: loanId },
      {
        onSuccess: (application) => navigate(routeTo.loanApply(application.applicationId)),
        onError: (error) => showToast(startApplicationErrorMessage(error), 'danger'),
      },
    )
  }

  const handleFooterClick = () => {
    if (trackedApplicationId !== null) {
      navigate(ROUTES.APPLICATIONS)
      return
    }
    handleApply()
  }

  return (
    <Modal
      open
      // 기본값 md(440px)에서는 제목이 두 줄로 접힌다. 지원사업 상세와 폭을 맞춘다
      size="lg"
      onClose={onClose}
      // 로딩 중에도 모달 골격이 보여야 해서 제목에 임시 문구를 둔다
      title={data?.accountName ?? '대출 상품'}
      description={data?.description ?? undefined}
      headerRight={data && <ProductStatusBadge status={data.status} labels={LOAN_STATUS_LABEL} />}
      headerAction={
        data && (
          /*
           * 관심 목록 담기·빼기 (367). 요청이 도는 동안 방금 누른 값을 보여주고
           * 끝나면 무효화가 돌아 서버 값이 이긴다 — 그 처리는 BookmarkToggle 안에 있다.
           * 목록의 표도 같은 컴포넌트를 쓴다.
           */
          <BookmarkToggle
            programId={loanId}
            type={BOOKMARK_TARGET.LOAN}
            bookmarked={data.bookmarked}
            label={data.accountName}
          />
        )
      }
      footer={
        data && (
          <Button
            className="w-full"
            disabled={!canApplyNow && trackedApplicationId === null}
            loading={createApplication.isPending}
            onClick={handleFooterClick}
          >
            {FOOTER_LABEL[data.status]}
          </Button>
        )
      }
    >
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <Skeleton key={row} variant="text" height={18} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-body2 text-text-secondary">
          상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {data && (
        <dl>
          <Row label="금리">연 {data.interestRate}%</Row>
          <Row label="한도">
            최소 {formatMoneyShort(data.minLoanBalance)} ~ 최대{' '}
            {formatMoneyShort(data.maxLoanBalance)}
          </Row>
          <Row label="기관">{data.bankName}</Row>
          {/* 기간이 '일' 이다. 매일 한 회차씩 갚아서 365일이면 365회다 */}
          <Row label="상환">
            {data.period}일 · {data.repaymentMethod}
          </Row>
          <Row label="업력">{data.conditions.firmAge}년 이상</Row>
          <Row label="조건">{describeConditions(data.conditions)}</Row>
          <Row label="신용등급">{data.conditions.ratingName}등급 이상</Row>
          <Row label="실행">승인 시 출금 계좌로 입금 (신청 시 입력)</Row>

          {/*
            불가 사유는 조건 줄 아래가 아니라 목록 끝에 둔다. 조건은 상품의 성질이고
            사유는 나와 상품 사이의 문제라, 섞어 두면 어느 쪽이 상품 설명인지 흐려진다.

            INELIGIBLE 이 아니어도 보여준다. 서버가 상태와 무관하게 내려주는데, 서류를
            준비하는 동안 신용등급이 떨어지는 경우가 있어서다. 다 준비해서 제출한 뒤
            반려되는 것보다 지금 아는 편이 낫다.
          */}
          {data.ineligibleReasons.length > 0 && (
            <div className="bg-danger-soft mt-3 rounded-sm px-3.5 py-3">
              <p className="text-body2 text-danger font-semibold">지금은 신청할 수 없어요</p>
              <ul className="text-body2 text-text-secondary mt-1.5 flex flex-col gap-1">
                {data.ineligibleReasons.map((reason) => (
                  <li key={reason} className="break-keep">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </dl>
      )}
    </Modal>
  )
}
