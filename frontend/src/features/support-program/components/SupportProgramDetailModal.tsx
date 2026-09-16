import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { useCreateApplication } from '@/features/application/hooks/useApplication'
import { APPLICATION_SOURCE } from '@/features/application/model/types'
import { useSupportProgramDetail } from '@/features/support-program/hooks/useSupportProgramDetail'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { routeTo } from '@/shared/constants/routes'
import { useBookmarkToggle } from '@/shared/hooks/useBookmarkToggle'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { BOOKMARK_TARGET } from '@/shared/types'
import BookmarkButton from '@/shared/ui/BookmarkButton'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 상태별 하단 버튼 문구와 갈 곳.
 *
 *   ELIGIBLE    신청하기            → 194 지원금 신청·서류 제출
 *   PREPARING   이어서 작성하기      → 194
 *   SUBMITTED   신청 내역 보기       → 202 신청 현황
 *   REVIEWING   신청 내역 보기       → 202
 *   APPROVED    지급 내역 보기       → 202 (대출은 '승인' 이라 문구가 다르다)
 *   PAID        지급 내역 보기       → 202
 *   INELIGIBLE  신청 자격이 안 돼요  → 갈 곳이 없다
 *
 * ELIGIBLE·PREPARING 은 연결됐다. 둘 다 신청 생성을 부르면 되는데, 서버가 준비중인
 * 건이 있으면 새로 만들지 않고 그걸 돌려주기 때문이다.
 *
 * ⚠️ SUBMITTED 이상은 아직 비활성이다. 그 공고의 신청 건으로 가야 하는데 상세 응답에
 *    applicationId 가 없어 어느 건인지 알 수 없다. 대출은 확정 명세에 들어왔으니
 *    지원사업도 같이 요청해 둔 상태다. INELIGIBLE 은 그 뒤에도 계속 비활성이다.
 */
const FOOTER_LABEL: Record<ProductStatus, string> = {
  ELIGIBLE: '신청하기',
  PREPARING: '이어서 작성하기',
  SUBMITTED: '신청 내역 보기',
  REVIEWING: '신청 내역 보기',
  APPROVED: '지급 내역 보기',
  PAID: '지급 내역 보기',
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

interface SupportProgramDetailModalProps {
  supportProgramId: number
  onClose: () => void
}

/**
 * 지원사업 상세 모달 (S15P21D101-215)
 *
 * 주소를 모른다. 목록 화면에서는 `/support-programs/:supportProgramId` 자식 라우트로
 * 뜨고, 대시보드 카드에서는 주소를 바꾸지 않고 그 자리에 뜬다. 라우팅은
 * SupportProgramDetailRoute 가 맡는다. 214 대출 상세 모달과 같은 구조다.
 */
export default function SupportProgramDetailModal({
  supportProgramId,
  onClose,
}: SupportProgramDetailModalProps) {
  const { data, isLoading, isError } = useSupportProgramDetail(supportProgramId)
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)

  /*
   * ⚠️ features 끼리 부르는 건 원래 피해야 한다. 대출 상세 모달과 같은 예외다 —
   *    모달을 여는 곳이 여럿이라 프롭으로 내리면 같은 import 가 그만큼 늘어난다.
   *    조합을 pages 층으로 올리는 게 정석인데 별도 티켓으로 뻐다.
   */
  const createApplication = useCreateApplication()

  const canApply = data?.status === 'ELIGIBLE' || data?.status === 'PREPARING'

  const handleApply = () => {
    createApplication.mutate(
      { type: APPLICATION_SOURCE.SUPPORT_PROGRAM, programId: supportProgramId },
      {
        onSuccess: (application) =>
          navigate(routeTo.supportProgramApply(application.applicationId)),
        onError: () => showToast('신청을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.', 'danger'),
      },
    )
  }

  /*
   * 관심 목록 담기·빼기 (367). 대출 상세와 같은 처리다 — 요청이 도는 동안에는 방금
   * 누른 값을 보여주고, 끝나면 무효화가 돌아 서버 값이 이긴다. 자세한 건 그쪽 주석에.
   *
   * ⚠️ 응답 필드가 `bookmarked` 가 아니라 `isBookmark` 다. 대출과 이름이 다르다.
   */
  const toggleBookmark = useBookmarkToggle()
  const bookmarked = toggleBookmark.isPending
    ? toggleBookmark.variables.next
    : (data?.isBookmark ?? false)

  return (
    <Modal
      open
      // 공고명이 길다. 기본값 md(440px)에서는 제목이 두 줄로 접힌다 (대출 상세와 같은 폭)
      size="lg"
      onClose={onClose}
      title={data?.pblancNm ?? '지원사업'}
      description={data?.bsnsSumryCn ?? undefined}
      headerRight={
        data && <ProductStatusBadge status={data.status} labels={SUPPORT_STATUS_LABEL} />
      }
      headerAction={
        data && (
          <BookmarkButton
            bookmarked={bookmarked}
            onToggle={() =>
              toggleBookmark.mutate({
                programId: supportProgramId,
                type: BOOKMARK_TARGET.SUPPORT,
                next: !bookmarked,
              })
            }
            label={data.pblancNm}
          />
        )
      }
      footer={
        data && (
          <Button
            className="w-full"
            disabled={!canApply}
            loading={createApplication.isPending}
            onClick={handleApply}
          >
            {FOOTER_LABEL[data.status]}
          </Button>
        )
      }
    >
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} variant="text" height={18} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-body2 text-text-secondary">
          공고 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {data && (
        <dl>
          <Row label="소관">{data.jrsdInsttNm}</Row>
          {/* 시안은 '바우처' 였지만 응답의 type 은 SUPPORT/LOAN/ETC 뿐이다 */}
          <Row label="유형">{SUPPORT_PROGRAM_TYPE_LABEL[data.type]}</Row>

          {data.type !== 'ETC' && (
            <Row label="금액">
              최소 {formatMoneyShort(data.minBalance)} ~ 최대 {formatMoneyShort(data.maxBalance)}
              {data.type === 'LOAN' && (
                <span className="text-text-muted ml-2">연 {data.interestRate.toFixed(1)}%</span>
              )}
            </Row>
          )}

          {data.reqstMthPapersCn && <Row label="신청방법">{data.reqstMthPapersCn}</Row>}
          {data.refrncNm && <Row label="문의처">{data.refrncNm}</Row>}

          {/*
            'D-5' 와 임박 빨강을 넣지 않는다. 목록·관심 목록이 마감일을 날짜로만 보여주는데
            상세에서만 남은 날짜로 바뀌면 같은 공고가 화면을 옮길 때마다 다른 말로 읽힌다.
            연도는 남긴다 — 목록과 달리 여기는 내년 공고인지 확인하는 자리다.
          */}
          <Row label="접수">{data.endDate ? `~ ${data.endDate}` : '상시 접수'}</Row>
        </dl>
      )}
    </Modal>
  )
}
