import { Link, useNavigate } from 'react-router-dom'

import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'

const STATS = [
  { value: '3조 4,645억 원', label: '2026년 창업·소상공인 지원 예산\n통합공고 총예산' },
  { value: '508개', label: '전국 정부·지자체 지원사업\n통합공고 대상사업 수' },
  { value: '111개 기관', label: '중앙부처·지자체\n15개 부처 + 96개 지자체' },
]

function FeatureCard({
  title,
  rows,
  foot,
}: {
  title: string
  rows: [string, string][]
  foot: string
}) {
  return (
    <Card className="space-y-4 p-7">
      <p className="typo-label-sm">{title}</p>
      <ul className="space-y-3">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-4">
            <span className="typo-body1">{k}</span>
            <span className="typo-body2 text-text-muted shrink-0">{v}</span>
          </li>
        ))}
      </ul>
      <p className="typo-caption text-text-disabled">{foot}</p>
    </Card>
  )
}

function FeatureText({
  eyebrow,
  title,
  desc,
  chips,
}: {
  eyebrow: string
  title: string
  desc: string
  chips: [string, string]
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="typo-caption text-text-muted">{eyebrow}</p>
        <h3 className="font-heading text-text text-[26px] leading-[36px] font-bold">{title}</h3>
        <p className="typo-body1 text-text-secondary leading-[26px] whitespace-pre-line">{desc}</p>
      </div>
      <div className="flex gap-2">
        <Badge variant="solid">{chips[0]}</Badge>
        <span className="border-border-strong typo-badge text-text-secondary inline-flex h-6 items-center rounded-full border px-3">
          {chips[1]}
        </span>
      </div>
    </div>
  )
}

/** 01 · 01-1 시작 페이지 */
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 pt-40 pb-32 text-center">
        <h1 className="font-heading text-text text-[40px] leading-[52px] font-bold">
          받을 수 있는 정책자금,
          <br />
          3분 만에 확인하세요
        </h1>
        <p className="typo-body1 text-text-secondary mt-6">
          마이데이터만 연동하면 지금 신청 가능한 상품만 골라드려요
          <br />
          수수료 0원, 자격 판정부터 서류 검증까지 무료입니다.
        </p>

        <div className="divide-border mx-auto mt-16 grid max-w-[880px] grid-cols-3 divide-x">
          {STATS.map((s) => (
            <div key={s.value} className="px-6">
              <p className="font-heading text-[28px] leading-[38px] font-semibold">{s.value}</p>
              <p className="typo-caption text-text-muted mt-2.5 leading-[20px] whitespace-pre-line">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4">
          <Button size="lg" className="w-[230px]" onClick={() => navigate('/signup/terms')}>
            시작하기
          </Button>
          <p className="typo-body2 text-text-secondary">
            이미 계정이 있으세요?{' '}
            <Link to="/login" className="text-text underline-offset-2 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </section>

      {/* 01-1 확장 섹션 */}
      <section className="bg-surface">
        <div className="mx-auto grid min-h-[560px] max-w-[1200px] grid-cols-2 items-center gap-20 px-6 py-32">
          <FeatureText
            eyebrow="자격 판정"
            title="지금 받을 수 있는지, 3분 안에 판정해요"
            desc={
              '매출 ·업력·부채비율·신용등급을 상품 요건과 대조해\n가능 ·불가로 나눠서 보여드려요.'
            }
            chips={['가능 6건', '불가 14건']}
          />
          <FeatureCard
            title="판정 결과"
            rows={[
              ['소진공 일반경영안정자금', '가능'],
              ['스마트상점 기술보급', '가능'],
              ['청년창업사관학교', '불가'],
            ]}
            foot="신청 가능 6건 - 불가 14건"
          />
        </div>
      </section>

      <section className="bg-bg">
        <div className="mx-auto grid min-h-[560px] max-w-[1200px] grid-cols-2 items-center gap-20 px-6 py-32">
          <FeatureCard
            title="제출 서류 검증"
            rows={[
              ['부가세 과세표준증명원', '검증 통과'],
              ['재무제표', '검증 중'],
              ['등기부등본', '검증 실패'],
            ]}
            foot="인감 도장 ·서명·발급일자 자동 확인"
          />
          <FeatureText
            eyebrow="서류 검증"
            title="서류는 제출 전에 자동 완성하고 미리 검증해요"
            desc={
              '도장 ·서명 누락, 발급 유효기간 초과를 업로드 즉시 확인하\n고 기관에서 반려될 사유를 미리 잡아드려요.'
            }
            chips={['업로드 즉시 검증', '검증 실패 안내']}
          />
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid min-h-[560px] max-w-[1200px] grid-cols-2 items-center gap-20 px-6 py-32">
          <FeatureText
            eyebrow="자금 조합"
            title="부족한 금액은 조합으로 채워요"
            desc={
              '무상 지원금을 먼저 채우고, 남는 금액만 대출로 구성해 이자\n부담을 최소로 만들어드려요,'
            }
            chips={['이자 최소 조합', '한도 여유 조합']}
          />
          <FeatureCard
            title="추천 조합 - 5,000만 원"
            rows={[
              ['(1)스마트상점 바우처', '500만 원·무상'],
              ['(2)소진공 일반경영안정자금', '3,000만 원·연 3.4%'],
              ['(3)지역신보 보증부 대출', '1,500만 원 ·연 4.1%'],
            ]}
            foot="평균 금리 연 3.39%·월 상환 132만 원"
          />
        </div>
      </section>

      <section className="bg-bg">
        <div className="mx-auto grid min-h-[560px] max-w-[1200px] grid-cols-2 items-center gap-20 px-6 py-32">
          <FeatureCard
            title="예비창업자 맞춤 결과"
            rows={[
              ['동종업종 밀집도', '27곳·평균보다 높음'],
              ['예비창업자 대출', '4건'],
              ['예비창업자 지원금', '3건'],
            ]}
            foot="사업자 인증 없이 바로 이용"
          />
          <FeatureText
            eyebrow="예비 창업자"
            title="아직 사업자등록 전이어도 시작할 수 있어요"
            desc={
              '희망 업종과 지역만 입력하면 상권을 분석하고 예비창업자 전용\n지원금과 대출을 찾아드려요,'
            }
            chips={['상권 분석', '예비창업자 지원금']}
          />
        </div>
      </section>

      <section className="bg-primary py-32 text-center text-white">
        <h2 className="font-heading text-[30px] leading-[40px] font-semibold">
          지금 받을 수 있는 정책자금부터 확인해 보세요
        </h2>
        <p className="typo-body1 mt-3 text-white/85">수수료 0원 · 마이데이터 연동만 하면 끝</p>
        <button
          type="button"
          onClick={() => navigate('/signup/terms')}
          className="typo-label text-text mt-9 inline-flex h-12 items-center rounded-md bg-white px-9 hover:bg-white/90"
        >
          무료로 시작하기
        </button>
      </section>
    </div>
  )
}
