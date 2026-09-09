import Badge from '@/shared/ui/Badge'
import { cn } from '@/shared/utils/cn'

type BadgeVariant = 'success' | 'neutral' | 'outline' | 'danger'

interface DemoRow {
  label: string
  /** 오른쪽 정렬 값. 두 줄로 나눌 때 배열로 넘긴다 */
  value?: string[]
  badge?: { text: string; variant: BadgeVariant }
}

interface Band {
  eyebrow: string
  title: string
  body: string
  pills: [string, string]
  demo: { header: string; headerValue?: string; rows: DemoRow[]; footer: string }
}

/** 마케팅 카피와 기능 설명용 예시값. 서버에서 내려오지 않고 화면과 같이 배포된다 */
const BANDS: Band[] = [
  {
    eyebrow: '자격 판정',
    title: '지금 받을 수 있는지, 3분 안에 판정해요',
    body: '매출·업력·부채비율·신용등급을 상품 요건과 대조해 가능·불가로 나눠서 보여드려요.',
    pills: ['가능 6건', '불가 14건'],
    demo: {
      header: '판정 결과',
      rows: [
        { label: '소진공 일반경영안정자금', badge: { text: '가능', variant: 'success' } },
        { label: '스마트상점 기술보급', badge: { text: '가능', variant: 'success' } },
        { label: '청년창업사관학교', badge: { text: '불가', variant: 'outline' } },
      ],
      footer: '신청 가능 6건 · 불가 14건',
    },
  },
  {
    eyebrow: '서류 검증',
    title: '서류는 제출 전에 자동 완성하고 미리 검증해요',
    body: '도장·서명 누락, 발급 유효기간 초과를 업로드 즉시 확인하고 기관에서 반려될 사유를 미리 잡아드려요.',
    pills: ['업로드 즉시 검증', '검증 실패 안내'],
    demo: {
      header: '제출 서류 검증',
      rows: [
        { label: '부가세 과세표준증명원', badge: { text: '검증 통과', variant: 'success' } },
        { label: '재무제표', badge: { text: '검증 중', variant: 'neutral' } },
        { label: '등기부등본', badge: { text: '검증 실패', variant: 'danger' } },
      ],
      footer: '인감 도장·서명·발급일자 자동 확인',
    },
  },
  {
    eyebrow: '자금 조합',
    title: '부족한 금액은 조합으로 채워요',
    body: '무상 지원금을 먼저 채우고, 남는 금액만 대출로 구성해 이자 부담을 최소로 만들어드려요.',
    pills: ['이자 최소 조합', '한도 여유 조합'],
    demo: {
      header: '추천 조합',
      headerValue: '5,000만 원',
      rows: [
        { label: '1  스마트상점 바우처', value: ['500만 원', '무상'] },
        { label: '2  소진공 일반경영안정자금', value: ['3,000만 원', '연 3.4%'] },
        { label: '3  지역신보 보증부 대출', value: ['1,500만 원', '연 4.1%'] },
      ],
      footer: '평균 금리 연 3.39% · 월 상환 132만 원',
    },
  },
  {
    eyebrow: '예비 창업자',
    title: '아직 사업자등록 전이어도 시작할 수 있어요',
    body: '희망 업종과 지역만 입력하면 상권을 분석하고 예비창업자 전용 지원금과 대출을 찾아드려요.',
    pills: ['상권 분석', '예비창업자 지원금'],
    demo: {
      header: '예비창업자 맞춤 결과',
      rows: [
        { label: '동종업종 밀집도', value: ['27곳 · 평균보다 높음'] },
        { label: '예비창업자 대출', value: ['4건'] },
        { label: '예비창업자 지원금', value: ['3건'] },
      ],
      footer: '사업자 인증 없이 바로 이용',
    },
  },
]

function DemoPanel({ demo, onSurface }: { demo: Band['demo']; onSurface: boolean }) {
  return (
    <div
      className={cn(
        'border-border overflow-hidden rounded-md border',
        // 흰 밴드에서 패널까지 흰색이면 경계가 테두리 하나로만 남는다
        onSurface ? 'bg-bg' : 'bg-surface',
      )}
    >
      <div className="border-border-subtle text-caption text-text-muted flex items-center justify-between border-b px-3.5 py-2.5">
        <span>{demo.header}</span>
        {demo.headerValue && <span className="text-text tabular-nums">{demo.headerValue}</span>}
      </div>

      <ul>
        {demo.rows.map((row) => (
          <li
            key={row.label}
            className="border-border-subtle text-body2 text-text flex items-center justify-between gap-3 border-b px-3.5 py-2.5 last:border-b-0"
          >
            {/* 조합 순번 뒤 공백 두 칸을 살린다 */}
            <span className="whitespace-pre-wrap">{row.label}</span>

            {row.badge && <Badge variant={row.badge.variant}>{row.badge.text}</Badge>}

            {row.value && (
              <span className="text-caption text-text-secondary shrink-0 text-right tabular-nums">
                {row.value.map((line, i) => (
                  <span key={line} className={cn(i > 0 && 'block')}>
                    {line}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 패널의 결론이라 회색 보조문구로 두면 읽히지 않는다.
          리디자인이 사업자 인증 결과표에 쓰는 primary-soft 처리를 가져왔다 */}
      <p className="border-border-subtle bg-primary-soft text-primary text-body2 border-t px-3.5 py-2.5 font-semibold tabular-nums">
        {demo.footer}
      </p>
    </div>
  )
}

/** 랜딩 확장 섹션. 배경과 좌우 배치를 번갈아 둔다 */
export default function FeatureBands() {
  return (
    <>
      {BANDS.map((band, index) => {
        // 첫 밴드를 흰색으로 시작한다. bg 로 시작하면 페이지 배경과 같아서
        // 히어로와 밴드 사이에 경계가 안 생긴다
        const onSurface = index % 2 === 0
        // 배경과 달리 좌우는 텍스트 왼쪽으로 시작한다
        const demoFirst = index % 2 === 1

        return (
          <section
            key={band.title}
            className={cn(
              'grid items-center gap-[34px] px-6 py-[34px] sm:px-10 md:grid-cols-2',
              onSurface ? 'bg-surface' : 'bg-bg',
            )}
          >
            {/* 데모가 왼쪽인 밴드에서도 마크업 순서는 텍스트가 먼저다.
                1단으로 접히면 설명 없이 표부터 읽히기 때문 */}
            <div className={cn(demoFirst && 'md:order-2')}>
              <p className="text-caption text-text-muted">{band.eyebrow}</p>
              <h2 className="font-heading text-text mt-1.5 text-[21px] leading-snug font-bold tracking-[-0.02em] text-balance">
                {band.title}
              </h2>
              <p className="text-body2 text-text-secondary mt-2.5 mb-3.5 leading-[1.75]">
                {band.body}
              </p>

              <ul className="flex flex-wrap gap-2">
                <li className="bg-primary text-text-inverse text-body2 inline-flex h-[30px] items-center rounded-full px-3.5 font-medium">
                  {band.pills[0]}
                </li>
                <li className="border-border-strong bg-surface text-text text-body2 inline-flex h-[30px] items-center rounded-full border px-3.5 font-medium">
                  {band.pills[1]}
                </li>
              </ul>
            </div>

            <div className={cn(demoFirst && 'md:order-1')}>
              <DemoPanel demo={band.demo} onSurface={onSurface} />
            </div>
          </section>
        )
      })}
    </>
  )
}
