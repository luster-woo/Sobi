import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { APPLICATION_FILTER } from '@/features/application/model/filter'
import FundingAmountForm from '@/features/funding-plan/components/FundingAmountForm'
import FundingCombinationCard from '@/features/funding-plan/components/FundingCombinationCard'
import FundingComparisonTable from '@/features/funding-plan/components/FundingComparisonTable'
import { useApplyFundingBatch } from '@/features/funding-plan/hooks/useApplyFundingBatch'
import { useFundingRecommend } from '@/features/funding-plan/hooks/useFundingRecommend'
import { toBatchItems } from '@/features/funding-plan/model/batch'
import type { FundingCombination, FundingItem } from '@/features/funding-plan/model/types'
import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import SupportProgramDetailModal from '@/features/support-program/components/SupportProgramDetailModal'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { isPreOwner } from '@/shared/types'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Modal from '@/shared/ui/Modal'
import PageHeading from '@/shared/ui/PageHeading'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 자금 조합 (S15P21D101-200)
 *
 * 필요 금액을 넣으면 그 금액을 채우는 상품 조합 몇 개를 서버가 추천한다.
 *
 * 금액을 주소(?amount=50000000)에 둔다. 새로고침해도 결과가 남고, 뒤로가기로 이전
 * 금액의 추천에 돌아갈 수 있다. 상권 분석과 같은 방식이다.
 *
 * 고른 조합은 주소에 두지 않는다. 서버로 가는 조건이 아니고, 조합 목록이 바뀌면
 * 인덱스가 다른 조합을 가리키게 되어 주소로 공유할 수 있는 값이 아니다.
 *
 * 구성 상품 상세는 목록 화면들과 같은 모달을 그대로 쓴다. 조합 응답의 id 가
 * loan.id · support_program.id 라 바로 넘길 수 있다. 여기 두는 이유는 그 모달이
 * loan·support-program feature 것이어서다 — funding-plan 안에서 부르면 feature 끼리
 * 물린다. 관심 목록 화면도 같은 방식이다.
 */
/*
 * 조합으로 만든 신청은 전부 준비 중이다. 기본 탭(진행 중)으로 보내면 방금 만든 것이
 * 하나도 안 보여서 실패한 것처럼 읽힌다.
 */
const PREPARING_TAB = `${ROUTES.APPLICATIONS}?tab=${APPLICATION_FILTER.PREPARING}`

export function FundingPlanPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)
  const preOwner = isPreOwner(useAuthStore((state) => state.user)?.role ?? null)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [openItem, setOpenItem] = useState<FundingItem | null>(null)
  /* 확인 모달에 올린 조합. 한 번에 신청 건이 여러 개 생겨서 먼저 확인받는다 */
  const [applyTarget, setApplyTarget] = useState<FundingCombination | null>(null)

  const applyBatch = useApplyFundingBatch()

  const rawAmount = Number(searchParams.get('amount'))
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : undefined

  /*
   * 예비창업자는 이 화면을 쓸 수 없다. 추천 후보가 업체별 판정 테이블(suggest_loan ·
   * suggest_support_program)이라 사업자 정보 없이는 고를 상품이 없고, 서버도 첫 줄에서
   * 404(BUSINESS_004) 를 던진다. 조회를 막고 안내만 띄운다 — 상환 관리와 같은 처리다.
   */
  const { data, isLoading, isError } = useFundingRecommend(amount, { enabled: !preOwner })

  // 응답이 { targetAmount, recommendedCombinations } 한 덩어리로 온다
  const combinations = data?.recommendedCombinations

  const handleSubmit = (won: number) => {
    setSearchParams({ amount: String(won) })
    // 금액이 바뀌면 다른 조합 목록이라 대표를 첫 번째로 되돌린다
    setSelectedIndex(0)
  }

  // 목록이 줄어든 뒤에도 예전 인덱스를 가리키지 않게 막는다
  const selected = combinations?.[selectedIndex] ?? combinations?.[0]

  /**
   * 고른 조합으로 신청을 한 번에 만든다.
   *
   * 성공이든 실패든 신청 현황으로 보낸다. 서버가 항목을 하나씩 만들다가 중간에서 던지면
   * 앞의 건은 이미 만들어져 있어서, 실패라고 이 화면에 머물면 사용자가 무엇이 생겼는지
   * 볼 방법이 없다. 목록 무효화는 훅이 onSettled 로 한다.
   */
  const handleApply = () => {
    if (!applyTarget) return

    applyBatch.mutate(toBatchItems(applyTarget), {
      onSuccess: () => {
        setApplyTarget(null)
        showToast('신청을 시작했어요. 서류를 올리면 접수됩니다.')
        navigate(PREPARING_TAB)
      },
      onError: () => {
        setApplyTarget(null)
        showToast('일부만 시작됐을 수 있어요. 신청 현황에서 확인해 주세요.', 'warning')
        navigate(PREPARING_TAB)
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
      <PageHeading title="자금 조합" />

      {/*
        사이드바에는 메뉴가 그대로 보인다. role 마다 메뉴를 감추면 "내 화면에는 왜 없지"
        를 알 수 없어서, 들어와서 이유를 읽는 편이 낫다.
      */}
      {preOwner ? (
        <EmptyState
          title="사업자 등록번호를 입력해야 이용할 수 있어요."
          description="자금 조합은 업체의 매출·업력을 기준으로 상품을 골라요. 사업자 인증을 마치면 바로 쓸 수 있어요."
          action={<Button onClick={() => navigate(ROUTES.BUSINESS_VERIFY)}>사업자 인증하기</Button>}
        />
      ) : (
        <>
          <FundingAmountForm amount={amount} onSubmit={handleSubmit} />

          {!amount && (
            <EmptyState
              title="필요한 금액을 알려주세요"
              description="그 금액을 채우는 가장 유리한 상품 조합을 찾아드려요. 무상 지원금을 먼저 채워 이자를 줄입니다."
            />
          )}

          {isLoading && <Skeleton height={220} className="rounded-md" />}

          {isError && (
            <EmptyState
              title="조합을 찾지 못했어요"
              description="금액을 바꿔서 다시 시도해보세요."
            />
          )}

          {combinations && combinations.length === 0 && (
            <EmptyState
              title="이 금액을 채울 조합이 없어요"
              description="금액을 낮추거나, 자격 판정 정보를 갱신하면 더 많은 상품이 잡힙니다."
            />
          )}

          {selected && data && (
            /*
             * key 가 있어야 애니메이션이 다시 돈다. 없으면 React 가 같은 DOM 을 재사용해서
             * 내용만 바뀌고 애니메이션은 처음 한 번만 돈다.
             */
            <div key={selectedIndex} className="animate-fade-slide-in">
              <FundingCombinationCard
                combination={selected}
                order={selectedIndex + 1}
                // 주소의 금액이 아니라 서버가 실제로 계산에 쓴 금액을 넘긴다
                targetAmount={data.targetAmount}
                onOpenItem={setOpenItem}
                onApply={() => setApplyTarget(selected)}
                isApplying={applyBatch.isPending}
              />
            </div>
          )}

          {/*
        요약 카드를 두지 않는다. 아래 비교표와 같은 값을 같은 순서로 두 번 말하고 있었다.
        고르는 것도 표에서 되므로(선택 버튼) 카드가 할 일이 남지 않는다.
      */}
          {combinations && combinations.length > 1 && (
            <FundingComparisonTable
              combinations={combinations}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          )}
        </>
      )}

      {/* 지원사업은 지원금(GRANT)이든 융자성(LOAN)이든 같은 상세를 쓴다. 출처로만 가른다 */}
      {openItem?.sourceType === 'LOAN_PRODUCT' && (
        <LoanDetailModal loanId={openItem.id} onClose={() => setOpenItem(null)} />
      )}

      {openItem?.sourceType === 'SUPPORT_PROGRAM' && (
        <SupportProgramDetailModal
          supportProgramId={openItem.id}
          onClose={() => setOpenItem(null)}
        />
      )}

      {/*
        진행 확인. 신청 취소처럼 한 번 물어본다 — 되돌리려면 생긴 건을 하나씩 취소해야 한다.
      */}
      <Modal
        open={applyTarget !== null}
        onClose={() => {
          // 진행 중에는 닫지 않는다. 신청이 하나씩 만들어지는 중이다
          if (applyBatch.isPending) return
          setApplyTarget(null)
        }}
        title="이 조합으로 신청을 시작할까요?"
        description={
          applyTarget
            ? `${applyTarget.items.length}개 상품 · ${formatMoneyShort(applyTarget.totalFinancingAmount)}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setApplyTarget(null)}
              disabled={applyBatch.isPending}
            >
              돌아가기
            </Button>
            <Button onClick={handleApply} loading={applyBatch.isPending}>
              신청 시작
            </Button>
          </>
        }
      >
        <div className="text-body2 text-text-secondary flex flex-col gap-2 break-keep">
          <p>
            상품마다 신청 건이 하나씩 만들어져요. 아직 접수되는 건 아니고, 서류를 올린 뒤 상품별로
            신청해야 합니다.
          </p>
          {/* 한 번에 여러 건이 생기니 어디서 이어서 하면 되는지 먼저 알려준다 */}
          <p>만들어진 신청은 신청 현황의 '준비 중' 탭에 모입니다.</p>
        </div>
      </Modal>
    </div>
  )
}
