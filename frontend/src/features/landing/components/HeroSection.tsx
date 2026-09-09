import Button from '@/shared/ui/Button'

interface HeroSectionProps {
  /** 가입 절차 시작. 첫 단계가 약관 동의다 */
  onSignUp: () => void
  onLogin: () => void
}

/** 2026년 소상공인·창업 지원 통합공고 기준. 매년 1월 갱신된다 */
const STATS = [
  { value: '3조 4,645억 원', label: '2026년 창업·소상공인 지원 예산', sub: '통합공고 총예산' },
  { value: '508개', label: '전국 정부·지자체 지원사업', sub: '통합공고 대상사업 수' },
  { value: '111개 기관', label: '중앙부처·지자체', sub: '15개 부처 + 96개 지자체' },
]

export default function HeroSection({ onSignUp, onLogin }: HeroSectionProps) {
  return (
    <section className="px-6 pt-[68px] text-center">
      <h1 className="font-heading text-text text-[2rem] leading-[1.3] font-bold tracking-[-0.03em] text-balance sm:text-[2.25rem]">
        받을 수 있는 정책자금,
        <br />
        3분 만에 확인하세요
      </h1>

      <p className="text-body1 text-text-secondary mt-4 leading-[1.75]">
        마이데이터만 연동하면 지금 신청 가능한 상품만 골라드려요
        <br />
        수수료 0원, 자격 판정부터 서류 검증까지 무료입니다.
      </p>

      {/* 모바일에서는 세로로 쌓이면서 구분선이 왼쪽 테두리에서 위 테두리로 바뀐다 */}
      <dl className="mt-10 flex flex-col items-center justify-center gap-[18px] sm:flex-row sm:gap-0">
        {STATS.map(({ value, label, sub }) => (
          <div
            key={label}
            className="border-border w-full border-t pt-[18px] text-center first:border-t-0 first:pt-0 sm:w-auto sm:border-t-0 sm:border-l sm:px-[34px] sm:pt-0 sm:first:border-l-0"
          >
            <dd className="font-heading text-text text-[25px] leading-tight font-bold tracking-[-0.02em] tabular-nums">
              {value}
            </dd>
            <dt className="text-caption text-text-muted mt-1.5">{label}</dt>
            <dd className="text-caption text-text-muted/80 mt-0.5">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="border-border mx-auto mt-[38px] max-w-[300px] border-t pt-[34px]">
        <Button size="lg" className="w-full" onClick={onSignUp}>
          회원가입
        </Button>

        <p className="text-body2 text-text-secondary mt-5 mb-2">이미 계정이 있으세요?</p>

        <Button variant="outline" size="lg" className="w-full" onClick={onLogin}>
          로그인
        </Button>
      </div>
    </section>
  )
}
