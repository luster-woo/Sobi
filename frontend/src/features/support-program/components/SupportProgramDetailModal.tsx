import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { useCreateApplication } from '@/features/application/hooks/useApplication'
import { startApplicationErrorMessage } from '@/features/application/model/applicationError'
import { APPLICATION_SOURCE } from '@/features/application/model/types'
import { useSupportProgramDetail } from '@/features/support-program/hooks/useSupportProgramDetail'
import { useSupportProgramExplanation } from '@/features/support-program/hooks/useSupportProgramExplanation'
import { balanceRangeText } from '@/features/support-program/model/amount'
import { toNoticeLines } from '@/features/support-program/model/noticeText'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import {
  canApply,
  SUPPORT_STATUS_LABEL,
  type SupportStatus,
} from '@/shared/constants/productStatus'
import { ROUTES, routeTo } from '@/shared/constants/routes'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import { BOOKMARK_TARGET } from '@/shared/types'
import BookmarkToggle from '@/shared/ui/BookmarkToggle'
import Button from '@/shared/ui/Button'
import Modal from '@/shared/ui/Modal'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import Spinner from '@/shared/ui/Spinner'
import { cn } from '@/shared/utils/cn'

/**
 * 상태별 하단 버튼 문구와 갈 곳.
 *
 *   ELIGIBLE    신청하기            → 194 지원금 신청·서류 제출
 *   UNKNOWN     신청하기            → 194 (조건을 확인하지 못했을 뿐 신청은 된다)
 *   PREPARING   이어서 작성하기      → 194
 *   SUBMITTED   신청 내역 보기       → 202 신청 현황
 *   REVIEWING   신청 내역 보기       → 202
 *   APPROVED    지급 내역 보기       → 202 (대출은 '승인' 이라 문구가 다르다)
 *   PAID        지급 내역 보기       → 202
 *   INELIGIBLE  신청 자격이 안 돼요  → 갈 곳이 없다
 *
 * UNKNOWN 은 공고 문장을 LLM 이 읽다가 사람이 직접 확인해야 하는 조건을 만난 경우다
 * 확실히 안 되는 INELIGIBLE 과 달리 될 수도 있으므로 ELIGIBLE 과 똑같이 열어 둔다
 *
 * SUBMITTED 이상은 applicationId 로 신청 현황에 보낸다. 그 값이 상태가 신청에서 온
 * 경우에만 오므로, 상태를 다시 나열하지 않고 값이 있는지로 가른다.
 * INELIGIBLE 만 계속 비활성이다 — 갈 곳이 없다.
 */
const FOOTER_LABEL: Record<SupportStatus, string> = {
  ELIGIBLE: '신청하기',
  UNKNOWN: '신청하기',
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
  /*
   * 설명은 상세와 따로 부른다. 처음 만들 때 서버가 AI 로 2~3초를 쓰기 때문에,
   * 한 번에 받으면 공고를 누르는 순간 모달 전체가 멈춘다.
   *
   * 실패해도 화면은 멀쩡하다. 그때는 아래에서 reason 이 그대로 나간다.
   */
  const { data: explanationData, isLoading: explanationLoading } =
    useSupportProgramExplanation(supportProgramId)
  const explanation = explanationData?.explanation ?? null
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)

  /*
   * ⚠️ features 끼리 부르는 건 원래 피해야 한다. 대출 상세 모달과 같은 예외다 —
   *    모달을 여는 곳이 여럿이라 프롭으로 내리면 같은 import 가 그만큼 늘어난다.
   *    조합을 pages 층으로 올리는 게 정석인데 별도 티켓으로 뻐다.
   */
  const createApplication = useCreateApplication()

  const canApplyNow = data ? canApply(data.status) : false
  /*
   * 제출 이후 상태는 그 공고의 신청 건으로 보낸다. applicationId 는 상태가 신청에서
   * 온 경우에만 오므로 값 유무로 가른다 — 상태가 하나 더 생겨도 여기를 고칠 일이 없다.
   */
  const trackedApplicationId = canApplyNow ? null : (data?.applicationId ?? null)

  const handleFooterClick = () => {
    if (trackedApplicationId !== null) {
      navigate(ROUTES.APPLICATIONS)
      return
    }
    handleApply()
  }

  const handleApply = () => {
    createApplication.mutate(
      { type: APPLICATION_SOURCE.SUPPORT, programId: supportProgramId },
      {
        onSuccess: (application) =>
          navigate(routeTo.supportProgramApply(application.applicationId)),
        onError: (error) => showToast(startApplicationErrorMessage(error), 'danger'),
      },
    )
  }

  return (
    <Modal
      open
      // 공고명이 길다. 기본값 md(440px)에서는 제목이 두 줄로 접힌다 (대출 상세와 같은 폭)
      size="lg"
      onClose={onClose}
      title={data?.pblancNm ?? '지원사업'}
      description={data?.bsnsSumryCn ? <NoticeText raw={data.bsnsSumryCn} /> : undefined}
      headerRight={
        data && <ProductStatusBadge status={data.status} labels={SUPPORT_STATUS_LABEL} />
      }
      headerAction={
        data && (
          /* ⚠️ 응답 필드가 `bookmarked` 가 아니라 `isBookmark` 다. 대출과 이름이 다르다 */
          <BookmarkToggle
            programId={supportProgramId}
            type={BOOKMARK_TARGET.SUPPORT}
            bookmarked={data.isBookmark}
            label={data.pblancNm}
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
              {balanceRangeText(data.minBalance, data.maxBalance)}
              {/* 융자형이어도 이율이 공고문에 없으면 서버가 필드를 빼고 준다 */}
              {data.type === 'LOAN' && data.interestRate !== undefined && (
                <span className="text-text-muted ml-2">연 {data.interestRate.toFixed(1)}%</span>
              )}
            </Row>
          )}

          {data.reqstMthPapersCn && (
            <Row label="신청방법">
              <NoticeText raw={data.reqstMthPapersCn} />
            </Row>
          )}
          {data.refrncNm && <Row label="문의처">{data.refrncNm}</Row>}

          {/*
            'D-5' 와 임박 빨강을 넣지 않는다. 목록·관심 목록이 마감일을 날짜로만 보여주는데
            상세에서만 남은 날짜로 바뀌면 같은 공고가 화면을 옮길 때마다 다른 말로 읽힌다.
            연도는 남긴다 — 목록과 달리 여기는 내년 공고인지 확인하는 자리다.
          */}
          <Row label="접수">{data.endDate ? `~ ${data.endDate}` : '상시 접수'}</Row>

          {/*
            판정 결과. 상태 배지만으로는 '왜' 가 보이지 않는다.

            reason 은 마이데이터를 연동하지 않았으면 null 이고, 조건이 다 맞는 경우에도
            따로 설명할 게 없어 오지 않는다. 두 목록은 판정이 없으면 빈 배열이다.
          */}
          {(data.reason ||
            explanation ||
            explanationLoading ||
            data.checkItems.length > 0 ||
            data.benefits.length > 0) && (
            <div className="border-border-subtle mt-4 flex flex-col gap-3 border-t pt-4">
              {/*
                설명이 오면 그것만 보여준다. reason 은 "필수 요건을 충족합니다" 같은
                템플릿이라, 같은 말을 두 번 하는 꼴이 된다.

                설명은 상세보다 늦게 온다(처음 만들 때 서버가 2~3초). 그동안
                **기다리는 중이라는 것을 눈에 보이게** 한다 — 안 그러면 템플릿
                문장이 갑자기 다른 문장으로 바뀌어 사용자가 놀란다.
                reason 은 그 아래 남겨둔다. 판정 근거가 빈 화면이 되지 않게.
              */}
              {explanationLoading ? (
                <div
                  className="flex flex-col items-center gap-3 py-6"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Spinner size={40} decorative />
                  <p className="text-body1 text-text-secondary font-medium">
                    이유를 정리하고 있어요
                  </p>
                  {/* 왜 기다리는지 한 줄. 없으면 그냥 느린 화면으로 보인다 */}
                  <p className="text-body2 text-text-muted">공고 원문을 읽는 중이에요</p>
                </div>
              ) : explanation ? (
                <p className="text-body2 text-text-secondary break-keep">{explanation}</p>
              ) : data.reason ? (
                <p className="text-body2 text-text-secondary break-keep">{data.reason}</p>
              ) : null}

              {data.checkItems.length > 0 && (
                <div className="bg-warning-soft rounded-sm px-3.5 py-3">
                  {/*
                    미충족이라는 뜻이 아니다. 공고문에 사람이 직접 봐야 하는 조건이
                    있다는 말이라, '안 됩니다' 로 읽히지 않게 문구를 고른다.
                  */}
                  <p className="text-body2 text-warning font-semibold">신청 전에 확인해 주세요</p>
                  <ul className="text-body2 text-text-secondary mt-1.5 flex flex-col gap-1">
                    {data.checkItems.map((item) => (
                      <li key={item} className="break-keep">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.benefits.length > 0 && (
                <div className="bg-primary-soft rounded-sm px-3.5 py-3">
                  <p className="text-body2 text-primary font-semibold">이런 경우 더 유리해요</p>
                  <ul className="text-body2 text-text-secondary mt-1.5 flex flex-col gap-1">
                    {data.benefits.map((item) => (
                      <li key={item} className="break-keep">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </dl>
      )}
    </Modal>
  )
}

/**
 * 공고 원문을 줄로 나눠 그린다.
 *
 * 공공데이터가 개요·신청방법을 줄바꿈 없이 한 덩어리로 준다. 화면 폭에 맞춰 접히기만
 * 해서, 항목이 여섯 개든 열 개든 한 문단으로 읽힌다 — 어디까지가 한 항목인지 알 수 없다.
 *
 * 규칙은 model/noticeText.ts 에 있다. 여기서는 세부 항목만 들여쓴다.
 */
function NoticeText({ raw }: { raw: string }) {
  const lines = toNoticeLines(raw)

  return (
    <span className="flex flex-col gap-0.5">
      {lines.map((line, index) => (
        <span key={index} className={cn('break-keep', line.depth === 1 && 'pl-3')}>
          {line.text}
        </span>
      ))}
    </span>
  )
}
