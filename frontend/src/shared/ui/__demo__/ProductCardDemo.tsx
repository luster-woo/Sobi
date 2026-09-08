import { useState } from 'react'

import type { ProductStatus } from '@/shared/constants/productStatus'
import { PRODUCT_STATUS } from '@/shared/constants/productStatus'
import ProductCard, { type ProductMetric } from '@/shared/ui/ProductCard'

/**
 * S15P21D101-172 확인용 데모.
 *
 * 지원사업 타입 3종(SUPPORT / LOAN / ETC)과 상태 6종을 한 화면에서 봅니다.
 * 프로덕션 화면이 아니며, 확인 방식이 정해지면 정리 대상입니다.
 *
 * 금액·D-day 문자열은 화면 몫이라 여기서는 손으로 적어 넣었습니다. 실제로는
 * 각 feature 가 응답의 maxBalance·endDate 를 변환해서 넘깁니다.
 *
 * 보는 방법: src/main.tsx 에서 App 대신 이 컴포넌트를 렌더 (그 변경은 커밋하지 마세요)
 */

const SUPPORT_METRICS: ProductMetric[] = [
  { label: '지원 금액', value: '최대 500만 원' },
  { label: '접수 기간', value: 'D-10' },
]

const LOAN_METRICS: ProductMetric[] = [
  { label: '금리', value: '연 2.5%' },
  { label: '한도', value: '7,000만 원' },
]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-h3">{title}</h2>
        {hint && <p className="text-body2 text-text-muted mt-1">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export default function ProductCardDemo() {
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({
    support: true,
    loan1: true,
  })
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  const toggle = (key: string) => {
    setBookmarks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const statuses = Object.values(PRODUCT_STATUS) as ProductStatus[]

  return (
    <div className="bg-bg min-h-screen">
      <div className="gap-section mx-auto flex max-w-[960px] flex-col p-8">
        <header>
          <h1 className="text-h1">자금 상품 카드 확인</h1>
          <p className="text-body1 text-text-secondary mt-2">
            S15P21D101-172 · ProductCard (대출 · 지원사업 공용)
          </p>
        </header>

        <div className="border-border bg-surface-muted text-caption rounded-md border px-3 py-2">
          <span className="text-text-muted">마지막으로 클릭한 카드: </span>
          <span className="text-text font-semibold">{lastClicked ?? '없음'}</span>
        </div>

        {/* ───────── 지원사업 — 타입별 ───────── */}
        <Section
          title="지원사업 — type 별로 지표가 달라집니다"
          hint="카드는 하나입니다. metrics 배열만 다르게 넘깁니다"
        >
          <ProductCard
            title="소상공인 스마트상점 기술보급"
            organization="소상공인시장진흥공단"
            metrics={SUPPORT_METRICS}
            status="SUBMITTED"
            isBookmarked={bookmarks.support}
            onToggleBookmark={() => toggle('support')}
            onClick={() => setLastClicked('SUPPORT · 스마트상점 기술보급')}
          />

          <ProductCard
            title="소상공인 정책자금 직접대출"
            organization="소상공인시장진흥공단"
            metrics={LOAN_METRICS}
            status="POSSIBLE"
            isBookmarked={bookmarks.loanType}
            onToggleBookmark={() => toggle('loanType')}
            onClick={() => setLastClicked('LOAN · 정책자금 직접대출')}
          />

          <ProductCard
            title="소상공인을 위한 국비교육"
            organization="국가상공회의소"
            status="POSSIBLE"
            isBookmarked={bookmarks.etc}
            onToggleBookmark={() => toggle('etc')}
            onClick={() => setLastClicked('ETC · 국비교육')}
          />
        </Section>

        {/* ───────── 대출 목록 ───────── */}
        <Section title="대출 목록" hint="타입 구분이 없어 항상 금리 · 한도입니다">
          <ProductCard
            title="소진공 일반경영안정자금"
            organization="소상공인시장진흥공단"
            metrics={[
              { label: '금리', value: '연 3.4%' },
              { label: '한도', value: '7,000만 원' },
            ]}
            status="SUBMITTED"
            isBookmarked={bookmarks.loan1}
            onToggleBookmark={() => toggle('loan1')}
            onClick={() => setLastClicked('일반경영안정자금')}
          />

          <ProductCard
            title="소상공인 성장촉진자금"
            organization="소상공인시장진흥공단"
            metrics={[
              { label: '금리', value: '연 3.0%' },
              { label: '한도', value: '1억 원' },
            ]}
            status="POSSIBLE"
            isBookmarked={bookmarks.loan2}
            onToggleBookmark={() => toggle('loan2')}
            onClick={() => setLastClicked('성장촉진자금')}
          />

          <ProductCard
            title="청년고용연계자금"
            organization="중소벤처기업진흥공단"
            metrics={[
              { label: '금리', value: '연 2.5%' },
              { label: '한도', value: '1억 원' },
            ]}
            status="IMPOSSIBLE"
            isBookmarked={bookmarks.loan3}
            onToggleBookmark={() => toggle('loan3')}
            onClick={() => setLastClicked('청년고용연계자금')}
          />
        </Section>

        {/* ───────── 상태 6종 ───────── */}
        <Section
          title="상태 6종"
          hint="POSSIBLE 만 채워진 배지입니다. 지금 행동할 수 있는 유일한 상태라서요"
        >
          {statuses.map((status) => (
            <ProductCard
              key={status}
              title={`상태 확인용 카드 — ${status}`}
              organization="소상공인시장진흥공단"
              metrics={LOAN_METRICS}
              status={status}
              isBookmarked={bookmarks[status]}
              onToggleBookmark={() => toggle(status)}
              onClick={() => setLastClicked(status)}
            />
          ))}
        </Section>

        {/* ───────── 변형 ───────── */}
        <Section title="변형" hint="prop 을 빼면 해당 요소가 사라집니다">
          <ProductCard
            title="북마크 버튼 없음 (onToggleBookmark 미전달)"
            organization="자금 조합처럼 관심 등록이 없는 화면"
            metrics={LOAN_METRICS}
            status="POSSIBLE"
            onClick={() => setLastClicked('북마크 없는 카드')}
          />

          <ProductCard
            title="클릭 불가 (onClick 미전달)"
            organization="제목이 button 이 아니라 텍스트로 렌더됩니다"
            metrics={LOAN_METRICS}
            status="REVIEW"
            isBookmarked={bookmarks.noClick}
            onToggleBookmark={() => toggle('noClick')}
          />

          <ProductCard
            title="기관명 없음"
            metrics={SUPPORT_METRICS}
            status="APPROVED"
            isBookmarked={bookmarks.noOrg}
            onToggleBookmark={() => toggle('noOrg')}
            onClick={() => setLastClicked('기관명 없는 카드')}
          />

          <ProductCard
            title="제목이 아주 길 때 — 소상공인 경영환경 개선 및 디지털 전환 지원을 위한 스마트상점 기술보급 사업 2026년 2차 모집"
            organization="소상공인시장진흥공단"
            metrics={[
              { label: '지원 금액', value: '1인당 연 720만 원' },
              { label: '접수 기간', value: '상시' },
            ]}
            status="WRITING"
            isBookmarked={bookmarks.longTitle}
            onToggleBookmark={() => toggle('longTitle')}
            onClick={() => setLastClicked('긴 제목 카드')}
          />
        </Section>
      </div>
    </div>
  )
}