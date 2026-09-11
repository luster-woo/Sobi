import { useState } from 'react'
import { useNavigate } from 'react-router'

import FullRepaymentCard from '@/features/loan-repayment/components/FullRepaymentCard'
import LoanInfoPanel from '@/features/loan-repayment/components/LoanInfoPanel'
import LoanProductTabs from '@/features/loan-repayment/components/LoanProductTabs'
import RepaymentProgressPanel from '@/features/loan-repayment/components/RepaymentProgressPanel'
import RepaymentRecordTable from '@/features/loan-repayment/components/RepaymentRecordTable'
import RepaymentSummaryTiles from '@/features/loan-repayment/components/RepaymentSummaryTiles'
import { useLoanProducts, useRepaymentDetail } from '@/features/loan-repayment/hooks/useRepayment'
import { getRepaymentProgress } from '@/features/loan-repayment/model/progress'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { USER_ROLE } from '@/shared/types'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/**
 * 상환 관리 (S15P21D101-201)
 *
 * 대출 상품이 여러 개일 수 있어 탭으로 고르고, 고른 상품의 상환 내역을 따로 받는다.
 * 목록(list)에는 잔액·회차가 없고 내역(records)에만 있어서 두 번 부르는 구조다.
 *
 * 선택 상태를 URL 에 두지 않았다. 대출 계좌번호가 주소에 노출되면 안 되고, 상권 분석과
 * 달리 남에게 공유할 화면이 아니다.
 *
 * 완납하면 금융망에서 계좌가 삭제돼 목록에서 사라진다. 그래서 선택한 계좌가 목록에
 * 없으면 첫 번째로 되돌린다 — 아래 selectedAccountNo 계산이 그 처리다.
 */
export function LoanRepaymentPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isPreOwner = user?.role === USER_ROLE.PREENTREPRENEUR

  /*
   * 예비창업자는 이 화면을 쓸 수 없다. 상환할 대출은 사업자로 실행한 것이고, 금융망
   * 계좌 조회 자체가 사업자 기준이라 목록을 부를 수도 없다. 그래서 조회를 막고
   * (enabled: false 와 같은 효과) 안내만 띄운다.
   *
   * 사이드바에는 메뉴가 그대로 보인다. role 마다 메뉴를 감추면 "내 화면에는 왜 없지"
   * 를 알 수 없어서, 들어와서 이유를 읽는 편이 낫다.
   */
  const { data: products, isLoading, isError } = useLoanProducts({ enabled: !isPreOwner })
  const [pickedAccountNo, setPickedAccountNo] = useState<string | null>(null)

  /*
   * 렌더 중에 고른다. useEffect 로 setState 하면 한 프레임 빈 화면이 지나가고,
   * set-state-in-effect 규칙에도 걸린다.
   *   - 아직 아무것도 안 골랐으면       → 첫 번째
   *   - 고른 계좌가 목록에서 사라졌으면  → 첫 번째 (완납 직후)
   */
  const selected =
    products?.find((product) => product.accountNo === pickedAccountNo) ?? products?.[0]

  const {
    data: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useRepaymentDetail(selected?.accountNo)

  if (isPreOwner) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        <h1 className="text-h1">상환 관리</h1>

        <EmptyState
          title="사업자 등록번호를 입력해야 이용할 수 있어요."
          description="상환 관리는 사업자로 실행한 대출을 다루는 화면이에요. 사업자 인증을 마치면 바로 쓸 수 있어요."
          action={<Button onClick={() => navigate(ROUTES.BUSINESS_VERIFY)}>사업자 인증하기</Button>}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        <h1 className="text-h1">상환 관리</h1>

        <Skeleton variant="text" width={280} height={36} />
        <Skeleton height={78} className="rounded-md" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        <h1 className="text-h1">상환 관리</h1>

        <EmptyState
          title="대출 정보를 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
        />
      </div>
    )
  }

  if (!products || products.length === 0 || !selected) {
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
        <h1 className="text-h1">상환 관리</h1>

        <EmptyState
          title="상환 중인 대출이 없어요"
          description="대출을 신청하고 실행되면 여기에서 상환 현황을 확인할 수 있어요."
        />
      </div>
    )
  }

  const progress = detail ? getRepaymentProgress(detail.records, selected.loanPeriod) : null

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
      <h1 className="text-h1">상환 관리</h1>

      <LoanProductTabs
        products={products}
        selectedAccountNo={selected.accountNo}
        onSelect={setPickedAccountNo}
      />

      {isDetailLoading && <Skeleton height={78} className="rounded-md" />}

      {isDetailError && (
        <EmptyState
          title="상환 내역을 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
        />
      )}

      {detail && progress && (
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_292px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            <RepaymentSummaryTiles product={selected} detail={detail} progress={progress} />
            <RepaymentRecordTable records={detail.records} />

            <FullRepaymentCard product={selected} detail={detail} progress={progress} />
          </div>

          <div className="flex flex-col gap-3.5">
            <RepaymentProgressPanel progress={progress} />

            <LoanInfoPanel product={selected} />
          </div>
        </div>
      )}
    </div>
  )
}
