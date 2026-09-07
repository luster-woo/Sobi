import type { Support } from '@/shared/types'
import type { DashboardProduct } from './loans.mock'

export const mockSupports: Support[] = [
  {
    id: 'sp-1',
    name: '소상공인 스마트상점 기술보급',
    agency: '소상공인시장진흥공단',
    tags: ['바우처', '시설개선', '신규'],
    type: '바우처',
    amountLabel: '최대 500만 원',
    deadline: '2026-09-12',
    judgement: 'applied',
    bookmarked: true,
    description:
      '키오스크·테이블오더 도입 비용의 70%를 지원해요 (최대 500만 원). 상시근로자 5인 미만 소상공인이 대상이에요.',
    isNew: true,
  },
  {
    id: 'sp-2',
    name: '고용촉진장려금',
    agency: '고용노동부',
    tags: ['보조금', '인건비', '상시 접수'],
    type: '보조금',
    amountLabel: '1인당 연 720만',
    deadline: null,
    judgement: 'possible',
    bookmarked: false,
    description: '취업 취약계층을 고용한 사업주에게 1인당 연 720만 원까지 인건비를 지원해요.',
  },
  {
    id: 'sp-3',
    name: '소상공인 경영개선 컨설팅',
    agency: '소상공인시장진흥공단',
    tags: ['컨설팅', '신규'],
    type: '컨설팅',
    amountLabel: '최대 300만 원',
    deadline: '2026-10-20',
    judgement: 'possible',
    bookmarked: false,
    description: '경영·마케팅·세무 분야 전문가 컨설팅 비용을 최대 300만 원까지 지원해요.',
    isNew: true,
  },
  {
    id: 'sp-4',
    name: '지역 상권 활성화 지원',
    agency: '대구광역시',
    tags: ['보조금', '상인회 가입 필요'],
    type: '보조금',
    amountLabel: '최대 800만 원',
    deadline: '2026-11-05',
    judgement: 'impossible',
    bookmarked: true,
    description: '상인회 소속 점포의 간판·시설 개선 비용을 지원해요.',
  },
  {
    id: 'sp-5',
    name: '청년창업사관학교',
    agency: '중소벤처기업진흥공단',
    tags: ['보조금', '만 39세 이하'],
    type: '보조금',
    amountLabel: '최대 1억 원',
    deadline: '2026-10-02',
    judgement: 'impossible',
    bookmarked: false,
    description: '만 39세 이하 청년 창업자에게 사업화 자금과 교육·공간을 지원해요.',
  },
]

export const mockDashboardSupports: DashboardProduct[] = [
  { id: 'sp-2', name: '고용촉진장려금\n고용노동부', tags: ['보조금', '인건비'], metricLabel: '지원혜택', metricValue: '1인당 연 720만', bookmarked: false },
  { id: 'sp-3', name: '소상공인\n경영개선 컨설팅', tags: ['컨설팅', '신규'], metricLabel: '지원혜택', metricValue: '최대 300만 원', bookmarked: false },
  { id: 'sp-6', name: '대구\n소상공인 이자 지원', tags: ['보조금', '~ 10. 4'], metricLabel: '지원혜택', metricValue: '최대 200만 원', bookmarked: false },
  { id: 'sp-9', name: '소상공인\n온라인 판로 지원', tags: ['바우처', '신규'], metricLabel: '지원혜택', metricValue: '최대 400만 원', bookmarked: false },
  { id: 'sp-10', name: '중소기업\n노란우산 장려금', tags: ['보조금', '상시 접수'], metricLabel: '지원혜택', metricValue: '월 2만 원', bookmarked: false },
  { id: 'sp-11', name: '대구\n착한가격업소 지원', tags: ['보조금', '~ 11. 30'], metricLabel: '지원혜택', metricValue: '최대 100만 원', bookmarked: false },
  { id: 'sp-12', name: '소상공인\n배달·택배비 지원', tags: ['보조금', '연 1회'], metricLabel: '지원혜택', metricValue: '최대 30만 원', bookmarked: false },
  { id: 'sp-13', name: '소상공인\n에너지 효율 개선', tags: ['바우처', '시설개선'], metricLabel: '지원혜택', metricValue: '최대 600만 원', bookmarked: false },
]

export const mockPreDashboardSupports: DashboardProduct[] = [
  { id: 'sp-5', name: '청년창업사관학교\n중소벤처기업진흥공단', tags: ['보조금', '만 39세 이하'], metricLabel: '지원혜택', metricValue: '최대 1억 원', bookmarked: true },
  { id: 'sp-7', name: '신사업창업사관학교\n소상공인시장진흥공단', tags: ['교육', '예비창업자'], metricLabel: '지원혜택', metricValue: '최대 2,000만 원', bookmarked: false },
  { id: 'sp-8', name: '대구\n예비창업자 점포 임차료 지원', tags: ['보조금', '~ 11. 20'], metricLabel: '지원혜택', metricValue: '최대 500만 원', bookmarked: false },
  { id: 'sp-14', name: '예비창업패키지\n창업진흥원', tags: ['보조금', '~ 10. 31'], metricLabel: '지원혜택', metricValue: '최대 5,000만 원', bookmarked: false },
  { id: 'sp-15', name: '소상공인\n창업 교육 바우처', tags: ['교육', '상시 접수'], metricLabel: '지원혜택', metricValue: '최대 200만 원', bookmarked: false },
  { id: 'sp-16', name: '대구\n청년 창업 공간 지원', tags: ['시설', '대구 소재'], metricLabel: '지원혜택', metricValue: '임차료 70%', bookmarked: false },
]
