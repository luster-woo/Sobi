import type { ReactNode } from 'react'

import EmptyState from '@/shared/ui/EmptyState'

/**
 * 예비창업자 대시보드 (S15P21D101-178)
 *
 * 이 화면은 다른 화면의 결과를 요약해 보여주는 자리다. 그래서 위젯 내용은 원본
 * 화면이 만들어진 뒤 그 컴포넌트를 재사용해 채운다.
 *   상권 분석 요약     → 182 상권 분석 결과 UI
 *   지원 가능한 대출   → 187 대출 상품 조회 UI (ProductCard 재사용)
 *   지원 가능한 지원금 → 192 지원금 조회 UI
 *
 * 지금은 섹션 자리와 빈 상태만 잡아둔 단계다.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  )
}

// 임시 화면
export default function PreOwnerDashboard() {
  return (
    <div className="gap-section mx-auto flex w-full max-w-[1080px] flex-col">
      <h1 className="text-h1">창업 준비 현황</h1>

      <Section title="상권 분석">
        <EmptyState
          title="아직 분석한 상권이 없어요"
          description="업종과 지역을 고르면 매출·유동인구를 분석해드려요."
        />
      </Section>

      <Section title="지원 가능한 대출">
        <EmptyState
          title="자격을 판정할 정보가 부족해요"
          description="정보를 연동하면 받을 수 있는 대출을 골라 보여드려요."
        />
      </Section>

      <Section title="지원 가능한 정부지원금">
        <EmptyState
          title="자격을 판정할 정보가 부족해요"
          description="연동한 정보로 신청 가능한 지원사업을 찾아드려요."
        />
      </Section>
    </div>
  )
}
