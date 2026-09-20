import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import ApplicationChecklist from '@/features/application/components/ApplicationChecklist'
import ApplicationDocumentList from '@/features/application/components/ApplicationDocumentList'
import ApplicationSubmitForm from '@/features/application/components/ApplicationSubmitForm'
import {
  useApplicationDetail,
  useCancelApplication,
  useDownloadProgramDocument,
  useSubmitApplication,
  useUploadDocument,
  useWriteDraft,
} from '@/features/application/hooks/useApplication'
import { usePayoutAccounts } from '@/features/application/hooks/usePayoutAccounts'
import { submitApplicationErrorMessage } from '@/features/application/model/applicationError'
import { downloadErrorMessage } from '@/features/application/model/downloadError'
import { productName, productSummary } from '@/features/application/model/summary'
import {
  SUBMIT_ACCEPT_LABEL,
  UPLOAD_MAX_SIZE_MB,
  WRITE_ACCEPT_LABEL,
} from '@/features/application/model/upload'
import { uploadErrorMessage } from '@/features/application/model/uploadError'
import { ROUTES } from '@/shared/constants/routes'
import { useEstimatedProgress } from '@/shared/hooks/useEstimatedProgress'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { APPLICATION_STATUS_LABEL } from '@/shared/types/application'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Modal from '@/shared/ui/Modal'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'
import { maskAccountNo } from '@/shared/utils/mask'

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
  const draft = useWriteDraft()
  const downloadOriginal = useDownloadProgramDocument()
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
  /* 금액·계좌는 대출에서만 받는다. 지원사업은 유형과 무관하게 돈이 오가지 않는다 */
  const isLoan = detail.loan !== null

  /*
   * 제출 결과. 있으면 모달이 결과 화면으로 바뀐다.
   *
   * 갈 곳이 결과마다 다르다. 실행됐으면 다음 할 일이 상환이고, 거절이면 신청 현황에
   * 사유가 남는다. 성공한 사람을 신청 현황으로 보내면 할 일이 없는 화면을 본다.
   */
  const submitResult = submit.data ?? null
  const submitResultTitle = (() => {
    if (submitResult?.status !== 'PAID') return '심사에서 거절됐어요'
    return isLoan ? '대출이 실행됐어요' : '지급이 완료됐어요'
  })()

  /*
   * 다음에 할 일이 있는 곳으로 보낸다. 대출이 실행됐으면 그게 상환이고, 나머지는 전부
   * 신청 현황이다 — 지원사업은 상환이 없고, 거절이면 사유가 신청 현황에 남는다.
   */
  const submitDoneTo =
    isLoan && submitResult?.status === 'PAID' ? ROUTES.LOAN_REPAYMENTS : ROUTES.APPLICATIONS
  // 제출하고 나면 서류도 금액도 더 손댈 수 없다
  const isEditable = status === 'PREPARING'
  const selectedAccount = accounts?.find((account) => account.accountId === accountId)

  const handleUpload = (applicationDocumentId: number, file: File) => {
    upload.mutate(
      { applicationDocumentId, file },
      {
        /*
         * 작성 서류는 검증을 타지 않아 올리는 즉시 끝난다. 제출 서류만 AI 검증이 뒤에서 돌고, 
         * 그 결과는 상세 폴링으로 받는다.
         */
        onSuccess: (result) =>
          showToast(
            result.validationStatus === 'PASSED'
              ? '올렸어요.'
              : '올렸어요. 검증이 시작됩니다.',
          ),
        onError: (error) => showToast(uploadErrorMessage(error), 'danger'),
      },
    )
  }

  /**
   * AI 초안 받기.
   *
   * 만들기와 받기가 한 번이라 성공하면 훅이 그대로 파일을 저장한다. 최대 5분이라
   * 진행 모달을 띄운다 — 버튼만 잠그면 사용자가 멈춘 줄 알고 떠난다.
   */
  const handleWriteDraft = (programDocumentId: number) => {
    draft.mutate(programDocumentId, {
      onSuccess: () => showToast('초안을 받았어요. 내용을 확인하고 올려주세요.'),
      onError: (error) => void downloadErrorMessage(error).then((m) => showToast(m, 'danger')),
    })
  }

  /** 기관이 배포하는 빈 서식 받기 */
  const handleDownloadOriginal = (programDocumentId: number) => {
    downloadOriginal.mutate(programDocumentId, {
      onError: (error) => void downloadErrorMessage(error).then((m) => showToast(m, 'danger')),
    })
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
        // 지원사업은 둘 다 안 보낸다
        amount: isLoan ? Number(amount) : null,
        accountId: isLoan ? accountId : null,
      },
      {
        onError: (error) => {
          setSubmitOpen(false)
          showToast(submitApplicationErrorMessage(error, { isLoan }), 'danger')
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
              onWriteDraft={handleWriteDraft}
              draftingDocumentId={draft.isPending ? (draft.variables ?? null) : null}
              onDownloadOriginal={handleDownloadOriginal}
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
          {/*
            서류가 없으면 체크리스트도 업로드 제한도 할 말이 없다. '0 / 0 완료' 와 받지도
            않을 확장자 목록만 남아서, 빈 칸을 채우려고 둔 것처럼 보인다.
          */}
          {documents.length > 0 && <ApplicationChecklist documents={documents} />}

          {documents.length > 0 && (
          <Panel title="업로드 제한">
            <dl className="text-body2 flex flex-col gap-2 px-[15px] py-4">
              {/* 제출 서류는 AI 가 OCR 로 읽어야 해서 형식이 좁다 */}
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary shrink-0">제출 서류</dt>
                <dd className="text-text text-right">{SUBMIT_ACCEPT_LABEL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary shrink-0">작성 서류</dt>
                <dd className="text-text text-right">{WRITE_ACCEPT_LABEL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">용량</dt>
                <dd className="text-text">파일당 {UPLOAD_MAX_SIZE_MB}MB 이하</dd>
              </div>
            </dl>
          </Panel>
          )}

          {selectedAccount && (
            <Panel title="승인되면 출금 계좌로">
              <div className="px-[15px] py-4">
                <p className="text-body1 text-text font-semibold">
                  {selectedAccount.bankName} {maskAccountNo(selectedAccount.accountNo)}
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
          // X 로 닫든 버튼으로 닫든 같은 곳으로 간다
          if (submit.data) navigate(submitDoneTo)
        }}
        title={
          submitResult
            ? submitResultTitle
            : isLoan
              ? `${formatMoneyShort(Number(amount))}을 신청할까요?`
              : '신청할까요?'
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
              {submitDoneTo === ROUTES.LOAN_REPAYMENTS ? '상환 관리로' : '신청 현황으로'}
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
              isLoan ? (
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
                /*
                 * 지원사업은 금액도 계좌도 대출 계좌번호도 없어서, 대출 쪽 가지를 그대로
                 * 태우면 본문이 통째로 빈다. 다음에 무엇을 보면 되는지만 남긴다.
                 */
                <p>신청이 끝났어요. 진행 내역은 신청 현황에서 볼 수 있어요.</p>
              )
            ) : (
              <p>{submitResult.rejectReason ?? '사유가 확인되지 않았어요.'}</p>
            )}
          </div>
        ) : (
          <p className="text-body2 text-text-secondary break-keep">
            {isLoan && selectedAccount
              ? `${selectedAccount.bankName} ${selectedAccount.accountNo} 로 입금되고, 다음 날부터 같은 계좌에서 자동이체로 상환됩니다. `
              : ''}
            신청 후에는 취소할 수 없어요.
          </p>
        )}
      </Modal>

      {/*
        초안 진행 모달. 닫을 수 없다 — 창을 닫아도 요청은 계속 돌고, 다 만든 파일을
        받을 자리가 사라진다. AI 가 한 번 도는 비용이 그대로 버려진다.
      */}
      <DraftProgressModal open={draft.isPending} />
    </div>
  )
}

/** 예상 소요. 서버 read timeout 이 300초라 그 절반쯤을 보통으로 잡는다 */
const DRAFT_EXPECTED_MS = 150_000

/**
 * 초안 만드는 중 화면.
 *
 * 진행률은 **추정값이다.** 서버가 응답 하나만 주고 그 사이 어디까지 했는지 알려주지
 * 않는다 — 마이데이터 연동과 같은 상황이라 같은 훅을 쓴다. 응답 전에는 95% 에서
 * 멈추고, 도착하면 100 까지 채운다.
 *
 * 링이 아니라 막대를 쓰는 이유는 5분이 링으로 버티기에 너무 길어서다. 링은 3초나
 * 5분이나 똑같이 보여서 사용자가 멈춘 줄 안다. 막대는 느려도 움직이는 것이 보인다.
 */
function DraftProgressModal({ open }: { open: boolean }) {
  const { percent } = useEstimatedProgress({
    defs: [],
    expectedMs: DRAFT_EXPECTED_MS,
    minMs: 400,
    settled: !open,
  })

  return (
    <Modal open={open} onClose={() => {}} title="초안을 만들고 있어요">
      <div className="flex flex-col gap-3">
        <div className="bg-bg-canvas h-2 overflow-hidden rounded-full">
          <div
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="초안 생성 진행률"
            className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-body2 text-text-secondary break-keep">
          사업자 정보와 마이데이터를 읽어 서식을 채우고 있어요.{' '}
          <b className="text-text">최대 5분 가량 소요될 수 있습니다.</b> 창을 닫지 말고 기다려
          주세요.
        </p>
      </div>
    </Modal>
  )
}
