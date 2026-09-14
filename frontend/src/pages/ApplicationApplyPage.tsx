import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import ApplicationChecklist from '@/features/application/components/ApplicationChecklist'
import ApplicationDocumentList from '@/features/application/components/ApplicationDocumentList'
import ApplicationSubmitForm from '@/features/application/components/ApplicationSubmitForm'
import {
  useApplicationDetail,
  useRequestDraft,
  useSubmitApplication,
  useUploadDocument,
} from '@/features/application/hooks/useApplication'
import { usePayoutAccounts } from '@/features/application/hooks/usePayoutAccounts'
import { describeProduct } from '@/features/application/model/summary'
import { UPLOAD_ACCEPT_LABEL, UPLOAD_MAX_SIZE_MB } from '@/features/application/model/upload'
import { ROUTES } from '@/shared/constants/routes'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { APPLICATION_STATUS_LABEL } from '@/shared/types/application'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'

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
  const submit = useSubmitApplication()

  const [amount, setAmount] = useState('')
  const [accountNo, setAccountNo] = useState('')

  /*
   * 서버가 이미 들고 있는 값으로 폼을 채운다. useEffect 로 하면 한 번 더 그려지고
   * set-state-in-effect 규칙에도 걸려서, 렌더 중에 비교해 맞춘다.
   */
  const [seededId, setSeededId] = useState<number | null>(null)
  if (detail && seededId !== detail.applicationId) {
    setSeededId(detail.applicationId)
    setAmount(detail.applyAmount ? String(detail.applyAmount) : '')
    setAccountNo(detail.accountNo ?? '')
  }

  /*
   * 데이터가 오기 전에도 '목록으로' 를 그려야 해서 경로로 판단한다.
   * detail.loanId 로 가르면 로딩·에러 화면에서는 알 수 없다.
   */
  const isFromLoans = pathname.startsWith('/loans')
  const backTo = isFromLoans ? ROUTES.LOANS : ROUTES.SUPPORT_PROGRAMS
  const backLabel = isFromLoans ? '대출' : '지원 사업'

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
            {backLabel} 목록으로
          </Button>
        }
      />
    )
  }

  const { product, documents, status } = detail
  const summary = describeProduct(product)
  // 제출하고 나면 서류도 금액도 더 손댈 수 없다
  const isEditable = status === 'PREPARING'
  const selectedAccount = accounts?.find((account) => account.accountNo === accountNo)

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
   */
  const handleDownload = (url: string) => {
    window.open(url, '_blank', 'noopener')
  }

  const handleSubmit = () => {
    submit.mutate(
      {
        applicationId,
        // 지원사업은 금액을 입력받지 않는다
        applyAmount: detail.loanId !== null ? Number(amount) : null,
        accountNo,
      },
      {
        onSuccess: () => showToast('신청이 완료됐어요.'),
        onError: () => showToast('신청에 실패했어요. 잠시 후 다시 시도해 주세요.', 'danger'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-text font-bold break-keep">{product.name}</h1>
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
              <ApplicationSubmitForm
                detail={detail}
                accounts={accounts ?? []}
                amount={amount}
                onAmountChange={setAmount}
                accountNo={accountNo}
                onAccountNoChange={setAccountNo}
                isSubmitting={submit.isPending}
                onSubmit={handleSubmit}
              />
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
    </div>
  )
}
