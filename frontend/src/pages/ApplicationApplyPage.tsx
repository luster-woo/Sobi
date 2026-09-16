import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import ApplicationChecklist from '@/features/application/components/ApplicationChecklist'
import ApplicationDocumentList from '@/features/application/components/ApplicationDocumentList'
import ApplicationSubmitForm from '@/features/application/components/ApplicationSubmitForm'
import {
  useApplicationDetail,
  useCancelApplication,
  useRequestDraft,
  useSubmitApplication,
  useUploadDocument,
} from '@/features/application/hooks/useApplication'
import { usePayoutAccounts } from '@/features/application/hooks/usePayoutAccounts'
import { amountRange, productName, productSummary } from '@/features/application/model/summary'
import { UPLOAD_ACCEPT_LABEL, UPLOAD_MAX_SIZE_MB } from '@/features/application/model/upload'
import { ROUTES } from '@/shared/constants/routes'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { APPLICATION_STATUS_LABEL } from '@/shared/types/application'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Modal from '@/shared/ui/Modal'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import { toSafeExternalUrl } from '@/shared/utils/externalUrl'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 대출·지원사업 신청 · 서류 제출 (S15P21D101-189 · 194)
 *
 * 두 도메인이 이 화면 하나를 공유한다. 다른 건 신청 금액 입력뿐이라 컴포넌트를 나누지
 * 않고 loanId 유무로 갈랐다.
 *
 * 경로를 /loans/apply/:id 와 /support-programs/apply/:id 둘로 둔 이유는 '목록으로'
 * 링크 때문이다. 응답이 오기 전에도 어디서 왔는지 알아야 링크를 그릴 수 있다.
 *
 * 검증은 서버가 비동기로 돌린다. useApplicationDetail 이 검증 중인 서류가 있는 동안만
 * 폴링하고 끝나면 멈춘다 — 이 화면은 받은 데이터를 그리기만 한다.
 */
export function ApplicationApplyPage() {
  const { applicationId: rawId } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)

  const applicationId = Number(rawId)
  const { data: detail, isLoading, isError } = useApplicationDetail(applicationId)
  const { data: accounts } = usePayoutAccounts()
  const upload = useUploadDocument(applicationId)
  const draft = useRequestDraft(applicationId)
  const submit = useSubmitApplication(applicationId)
  const cancel = useCancelApplication()

  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  /*
   * 제출 확인 모달. 누르는 순간 실제로 대출이 실행되고 계좌가 열려서, 취소와 마찬가지로
   * 한 번 확인받는다. 같은 모달이 확인 → 진행 중 → 결과 세 모습을 갖는다.
   */
  const [submitOpen, setSubmitOpen] = useState(false)

  /*
   * 데이터가 오기 전에도 '목록으로' 를 그려야 해서 경로로 판단한다.
   * detail.loanId 로 가르면 로딩·에러 화면에서는 알 수 없다.
   */
  const isFromLoans = pathname.startsWith('/loans')
  const backTo = isFromLoans ? ROUTES.LOANS : ROUTES.SUPPORT_PROGRAMS

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[520px] w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <EmptyState
        title="신청 내역을 불러오지 못했어요"
        description="주소가 잘못되었거나 이미 취소된 신청일 수 있어요."
        action={
          <Button variant="outline" onClick={() => navigate(backTo)}>
            목록으로
          </Button>
        }
      />
    )
  }

  const { documents, status } = detail
  const name = productName(detail)
  const summary = productSummary(detail)
  /* 범위가 있으면 돈이 오가는 신청이다. 금액·계좌 입력과 제출 본문이 여기서 갈린다 */
  const needsMoney = amountRange(detail) !== null

  /*
   * 제출 결과. 있으면 모달이 결과 화면으로 바뀐다.
   *
   * 갈 곳이 결과마다 다르다. 실행됐으면 다음 할 일이 상환이고, 거절이면 신청 현황에
   * 사유가 남는다. 성공한 사람을 신청 현황으로 보내면 할 일이 없는 화면을 본다.
   */
  const submitResult = submit.data ?? null
  const submitResultTitle =
    submitResult?.status === 'PAID'
      ? detail.loan
        ? '대출이 실행됐어요'
        : '지원금이 지급됐어요'
      : '심사에서 거절됐어요'
  const submitDoneTo =
    submitResult?.status === 'PAID' ? ROUTES.LOAN_REPAYMENTS : ROUTES.APPLICATIONS
  // 제출하고 나면 서류도 금액도 더 손댈 수 없다
  const isEditable = status === 'PREPARING'
  const selectedAccount = accounts?.find((account) => account.accountId === accountId)

  const handleUpload = (applicationDocumentId: number, file: File) => {
    upload.mutate(
      { applicationDocumentId, file },
      {
        onSuccess: () => showToast('올렸어요. 검증이 시작됩니다.'),
        onError: () => showToast('업로드에 실패했어요. 잠시 후 다시 시도해 주세요.', 'danger'),
      },
    )
  }

  const handleRequestDraft = (applicationDocumentId: number) => {
    draft.mutate(applicationDocumentId, {
      onSuccess: () => showToast('초안을 만들고 있어요. 잠시만 기다려 주세요.'),
      onError: () => showToast('초안 작성에 실패했어요. 잠시 후 다시 시도해 주세요.', 'danger'),
    })
  }

  /*
   * 새 탭으로 열어 브라우저가 받게 한다. a[download] 를 쓰면 다른 출처의 파일에는
   * 속성이 무시되어 내려받기 대신 이동이 되는데, 그럴 바엔 처음부터 열어 주는 편이 낫다.
   *
   * ⚠️ 여는 주소를 먼저 거른다. `templateUrl`·`draftUrl` 은 공공데이터에서 흘러온
   *    값이라 서버가 줬다고 안전하지 않다. `javascript:` 가 섞여 있으면 window.open 이
   *    **우리 출처 권한으로 실행해 버린다** — 메모리에 둔 토큰도 같은 페이지 스크립트라
   *    그대로 꺼내 간다.
   *
   *    noreferrer 를 같이 준다. noopener 만 있으면 새 탭이 우리 주소를 referrer 로
   *    가져간다 — 신청 화면 주소에는 applicationId 가 들어 있다.
   */

  const handleDownload = (url: string | null) => {
    // ⚠️ 413 대기. 서식·초안을 어떻게 내려받을지 아직 정해지지 않았다
    if (url === null) {
      showToast('서식 내려받기는 준비 중이에요.', 'warning')
      return
    }

    const safe = toSafeExternalUrl(url)

    if (!safe) {
      showToast('열 수 없는 주소예요. 담당 기관에 문의해 주세요.', 'danger')
      return
    }

    window.open(safe, '_blank', 'noopener,noreferrer')
  }

  /**
   * 신청 취소. 신청 건과 올린 서류가 서버에서 함께 사라진다.
   *
   * 되돌릴 수 없어서 모달로 한 번 확인받는다. 성공하면 지우면서 온 목록으로 돌려보낸다 —
   * 삭제된 건을 다시 조회하면 404 라 그 자리에 머물면 에러 화면이 된다.
   */
  const handleCancel = () => {
    cancel.mutate(applicationId, {
      onSuccess: () => {
        setCancelOpen(false)
        showToast('신청을 취소했어요.')
        navigate(backTo)
      },
      onError: () => showToast('취소하지 못했어요. 잠시 후 다시 시도해 주세요.', 'danger'),
    })
  }

  /**
   * 최종 신청.
   *
   * 되돌릴 수 없다. 서버가 이 한 번의 요청에서 심사·계좌개설·입금까지 끝낸다 —
   * 접수만 하고 기다리는 구간이 없다. 그래서 결과도 응답으로 바로 온다.
   *
   * 거절도 200 이라 onError 가 아니라 결과 화면에서 status 로 가른다.
   */
  const handleSubmit = () => {
    submit.mutate(
      {
        // 돈이 오가지 않는 공고('기타')는 둘 다 안 보낸다
        amount: needsMoney ? Number(amount) : null,
        accountId: needsMoney ? accountId : null,
      },
      {
        onError: () => {
          setSubmitOpen(false)
          showToast('신청에 실패했어요. 잠시 후 다시 시도해 주세요.', 'danger')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        {/*
          나가는 길이 없으면 그냥 떠려던 사람이 아래 '신청 취소' 를 누른다.
          서류까지 사라지므로 돌아갈 곳을 먼저 보여 준다.
        */}
        <Link
          to={backTo}
          className="text-body2 text-text-secondary hover:text-text mb-2 inline-block"
        >
          ← 목록으로
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-text font-bold break-keep">{name}</h1>
          {!isEditable && <Badge variant="neutral">{APPLICATION_STATUS_LABEL[status]}</Badge>}
        </div>
        {/* 금리도 금액도 없는 공고가 있어서, 요약이 비면 줄 자체를 안 그린다 */}
        {summary && <p className="text-body2 text-text-secondary mt-1">{summary}</p>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex flex-col gap-6 p-5">
            <ApplicationDocumentList
              documents={documents}
              onUpload={handleUpload}
              onFileError={(message) => showToast(message, 'warning')}
              onRequestDraft={handleRequestDraft}
              onDownload={handleDownload}
              readOnly={!isEditable}
            />

            {isEditable ? (
              <>
                <ApplicationSubmitForm
                  detail={detail}
                  accounts={accounts ?? []}
                  amount={amount}
                  onAmountChange={setAmount}
                  accountId={accountId}
                  onAccountIdChange={setAccountId}
                  isSubmitting={submit.isPending}
                  onSubmit={() => setSubmitOpen(true)}
                />

                {/*
                  주 버튼과 무게를 다르게 한다. 같은 크기의 버튼으로 두면 신청하려다 잘못 누른다.
                  평소에는 회색이고 올렸을 때만 위험 색으로 바뀐다.
                */}
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="text-body2 text-text-secondary hover:text-danger -mt-2 self-center underline-offset-4 transition-colors hover:underline"
                >
                  신청 취소
                </button>
              </>
            ) : (
              <p className="text-body2 text-text-secondary bg-surface-alt rounded-md px-5 py-4">
                신청이 접수됐어요. 진행 상황은 신청 현황에서 확인할 수 있어요.
              </p>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <ApplicationChecklist documents={documents} />

          <Panel title="업로드 제한">
            <dl className="text-body2 flex flex-col gap-2 px-[15px] py-4">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">형식</dt>
                <dd className="text-text">{UPLOAD_ACCEPT_LABEL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">용량</dt>
                <dd className="text-text">파일당 {UPLOAD_MAX_SIZE_MB}MB 이하</dd>
              </div>
            </dl>
          </Panel>

          {selectedAccount && (
            <Panel title="승인되면 출금 계좌로">
              <div className="px-[15px] py-4">
                <p className="text-body1 text-text font-semibold">
                  {selectedAccount.bankName} {selectedAccount.accountNo}
                </p>
                <p className="text-body2 text-text-secondary mt-1 break-keep">
                  신청 화면에서 고른 출금 계좌예요. 실행금 입금과 자동상환에 사용돼요.
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="신청을 취소할까요?"
        description={name}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancel.isPending}
            >
              돌아가기
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancel.isPending}>
              신청 취소
            </Button>
          </>
        }
      >
        <p className="text-body2 text-text-secondary break-keep">
          지금까지 올린 서류도 함께 삭제되고 되돌릴 수 없어요. 다시 신청하려면 서류를 처음부터
          올려야 합니다.
        </p>
      </Modal>

      {/*
        제출 모달. 한 모달이 세 모습을 갖는다 — 확인 → 진행 중 → 결과.
        열고 닫기를 반복하면 어수선하고, 무엇보다 진행 중 구간에 창이 비면 사용자가
        한 번 더 누르거나 떠난다. 그 사이에 돈은 이미 나가고 있다.

        결과(submit.data)가 있으면 결과 화면이 이긴다. 거절도 200 이라 여기서 가른다.
      */}
      <Modal
        open={submitOpen}
        onClose={() => {
          // 진행 중에는 닫히지 않는다. 금융망 호출이 도는 중이다
          if (submit.isPending) return
          setSubmitOpen(false)
          if (submit.data) navigate(submit.data.status === 'PAID' ? ROUTES.LOAN_REPAYMENTS : backTo)
        }}
        title={
          submitResult ? submitResultTitle : `${formatMoneyShort(Number(amount))}을 신청할까요?`
        }
        description={submitResult ? undefined : name}
        footer={
          submitResult ? (
            <Button
              onClick={() => {
                setSubmitOpen(false)
                navigate(submitDoneTo)
              }}
            >
              {submitResult.status === 'PAID' ? '상환 관리로' : '신청 현황으로'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setSubmitOpen(false)}
                disabled={submit.isPending}
              >
                돌아가기
              </Button>
              <Button onClick={handleSubmit} loading={submit.isPending}>
                신청하기
              </Button>
            </>
          )
        }
      >
        {submitResult ? (
          <div className="text-body2 text-text-secondary flex flex-col gap-2 break-keep">
            {submitResult.status === 'PAID' ? (
              <>
                {submitResult.amount !== null && (
                  <p className="text-body1 text-text font-semibold">
                    {formatMoneyShort(submitResult.amount)}
                  </p>
                )}
                {selectedAccount && (
                  <p>
                    {selectedAccount.bankName} {selectedAccount.accountNo} 로 입금됩니다.
                  </p>
                )}
                {submitResult.loanAccountNo && (
                  <p>
                    대출 계좌 {submitResult.loanAccountNo} · 내일부터 같은 계좌에서 자동이체로
                    상환됩니다.
                  </p>
                )}
              </>
            ) : (
              <p>{submitResult.rejectReason ?? '사유가 확인되지 않았어요.'}</p>
            )}
          </div>
        ) : (
          <p className="text-body2 text-text-secondary break-keep">
            {needsMoney && selectedAccount
              ? `${selectedAccount.bankName} ${selectedAccount.accountNo} 로 입금되고, 다음 날부터 같은 계좌에서 자동이체로 상환됩니다. `
              : ''}
            신청 후에는 취소할 수 없어요.
          </p>
        )}
      </Modal>
    </div>
  )
}
