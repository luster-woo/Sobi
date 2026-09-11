import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { useSupportProgramDetail } from '@/features/support-program/hooks/useSupportProgramDetail'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import type { ProductStatus } from '@/shared/constants/productStatus'
import { SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import BookmarkButton from '@/shared/ui/BookmarkButton'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 상태별 하단 버튼 문구와 갈 곳.
 *
 *   POSSIBLE    신청하기            → 194 지원금 신청·서류 제출
 *   WRITING     이어서 작성하기      → 194
 *   SUBMITTED   신청 내역 보기       → 202 신청 현황
 *   REVIEW      신청 내역 보기       → 202
 *   APPROVED    지급 내역 보기       → 202 (대출은 '보유중' 이라 문구가 다르다)
 *   IMPOSSIBLE  신청 자격이 안 돼요  → 갈 곳이 없다
 *
 * ⚠️ 194·202 화면이 아직 없어서 버튼이 눌리지 않는다. 라우트가 생기면 onClick 을 넣고
 *    disabled 를 지우면 된다. IMPOSSIBLE 은 그 뒤에도 계속 비활성이다.
 */
const FOOTER_LABEL: Record<ProductStatus, string> = {
  POSSIBLE: '신청하기',
  WRITING: '이어서 작성하기',
  SUBMITTED: '신청 내역 보기',
  REVIEW: '신청 내역 보기',
  APPROVED: '지급 내역 보기',
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

  // ⚠️ 대출 상세와 같다. `/bookmark` 가 붙으면 useMutation 으로 바꾼다
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => {
    if (data) setBookmarked(data.isBookmark)
  }, [data])

  return (
    <Modal
      open
      // 공고명이 길다. 기본값 md(440px)에서는 제목이 두 줄로 접힌다 (대출 상세와 같은 폭)
      size="lg"
      onClose={onClose}
      title={data?.pblancNm ?? '지원사업'}
      description={data?.bsnsSumryCn ?? undefined}
      headerRight={data && <ProductStatusBadge status={data.status} labels={SUPPORT_STATUS_LABEL} />}
      headerAction={
        data && (
          <BookmarkButton
            bookmarked={bookmarked}
            onToggle={() => setBookmarked((previous) => !previous)}
            label={data.pblancNm}
          />
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
