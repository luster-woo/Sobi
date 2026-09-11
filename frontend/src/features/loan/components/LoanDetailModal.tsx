import type { ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { useLoanDetail } from '@/features/loan/hooks/useLoanDetail'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { LOAN_STATUS_LABEL } from '@/shared/constants/productStatus'
import { ROUTES } from '@/shared/constants/routes'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 상태별 하단 버튼 문구와 갈 곳.
 *
 *   POSSIBLE    신청하기            → 189 대출 신청·서류 제출
 *   WRITING     이어서 작성하기      → 189 (작성 중인 신청을 이어서)
 *   SUBMITTED   신청 내역 보기       → 202 신청 현황
 *   REVIEW      신청 내역 보기       → 202
 *   APPROVED    신청 내역 보기       → 202
 *   IMPOSSIBLE  신청 자격이 안 돼요  → 갈 곳이 없다
 *
 * 신청 완료 시점부터는 신청·서류 제출 화면에 다시 들어갈 수 없다.
 *
 * ⚠️ 189·202 화면이 아직 없어서 버튼이 눌리지 않는다. 라우트가 생기면 onClick 을 넣고
 *    disabled 를 지우면 된다. IMPOSSIBLE 은 그 뒤에도 계속 비활성이다.
 */
const FOOTER_LABEL: Record<ProductStatus, string> = {
  POSSIBLE: '신청하기',
  WRITING: '이어서 작성하기',
  SUBMITTED: '신청 내역 보기',
  REVIEW: '신청 내역 보기',
  APPROVED: '신청 내역 보기',
  IMPOSSIBLE: '신청 자격이 안 돼요',
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border-subtle flex gap-4 border-b py-3 last:border-b-0">
      <dt className="text-body2 text-text-muted w-20 shrink-0">{label}</dt>
      <dd className="text-body2 text-text flex-1">{children}</dd>
    </div>
  )
}

/**
 * 대출 상품 상세 모달 (S15P21D101-214)
 *
 * /loans/:loanId 자식 라우트로 렌더된다. 목록은 뒤에 그대로 남고 모달만 위에 뜬다.
 * 주소가 바뀌므로 링크 공유가 되고, 뒤로가기로 모달만 닫힌다.
 *
 * 닫을 때 목록의 검색어·필터를 잃지 않으려고 location.search 를 그대로 들고 돌아간다.
 */
export default function LoanDetailModal() {
  const { loanId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { data, isLoading, isError } = useLoanDetail(Number(loanId))

  const close = () => navigate({ pathname: ROUTES.LOANS, search: location.search })

  return (
    <Modal
      open
      // 기본값 md(440px)는 배지·북마크·닫기가 130px 을 먹어 제목이 두 줄로 접힌다.
      // 지원사업 상세와 폭을 맞춰 두 화면이 따로 놀지 않게 한다
      size="lg"
      onClose={close}
      // 로딩 중에도 모달 골격이 보여야 해서 제목에 임시 문구를 둔다
      title={data?.accountName ?? '대출 상품'}
      description={data?.description ?? undefined}
      headerRight={
        data && (
          <>
            <ProductStatusBadge status={data.status} labels={LOAN_STATUS_LABEL} />
            <span
              aria-label={data.isBookmark ? '저장됨' : '저장하지 않음'}
              className={data.isBookmark ? 'text-primary' : 'text-text-disabled'}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill={data.isBookmark ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3h12v18l-6-4-6 4z" />
              </svg>
            </span>
          </>
        )
      }
      footer={
        data && (
          <Button className="w-full" disabled>
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
          <Row label="금리">
            <span className="text-h3">연 {data.interestRate}%</span>
          </Row>
          <Row label="한도">
            최소 {formatMoneyShort(data.minLoanBalance)} ~ 최대{' '}
            {formatMoneyShort(data.maxLoanBalance)}
          </Row>
          {/* 시안에는 거치기간·상환방식·만기가 있었지만 응답에 period(개월)만 온다 */}
          <Row label="상환">총 {data.period}개월</Row>
          <Row label="업력">{data.firmAge}개월 이상</Row>
          <Row label="대상">{data.target}</Row>
          <Row label="신용등급">{data.rating}등급 이상</Row>
          <Row label="실행">승인 시 출금 계좌로 입금 (신청 시 입력)</Row>
        </dl>
      )}
    </Modal>
  )
}
