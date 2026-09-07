import type { Loan } from '@/shared/types'

export const mockLoans: Loan[] = [
  {
    id: 'ln-1',
    name: '소진공 일반경영안정자금',
    agency: '소상공인시장진흥공단',
    tags: ['운전자금', '거치 2년·상환 3년'],
    rate: 3.4,
    limitAmount: 70_000_000,
    minAmount: 30_000_000,
    deadline: '2026-09-30',
    judgement: 'applied',
    bookmarked: true,
    description: '업력 6개월 이상 소상공인 대상·대리대출(시중은행 취급)로 실행돼요.',
    repayment: '거치 2년· 원리금 균등 3년 (총 5년, 만기 2031. 9. 15)',
    minMonths: 6,
    target: '소상공인',
    creditScore: '850점 이상',
    execution: '승인 시 출금 계좌로 입금 (신청 시 입력)',
  },
  {
    id: 'ln-2',
    name: '지역신보 보증부 대출',
    agency: '대구신용보증재단',
    tags: ['운전자금', '보증서 필요', '상시 접수'],
    rate: 4.1,
    limitAmount: 50_000_000,
    deadline: null,
    judgement: 'holding',
    bookmarked: true,
    description: '대구신용보증재단 보증서를 담보로 시중은행에서 실행되는 운전자금 대출이에요.',
    repayment: '거치 1년· 원리금 균등 3년',
    minMonths: 3,
    target: '대구 소재 소상공인',
    creditScore: '제한 없음',
    execution: '보증서 발급 후 은행 실행',
  },
  {
    id: 'ln-3',
    name: '소상공인 성장촉진자금',
    agency: '소상공인시장진흥공단',
    tags: ['운전자금', '업력 3년 이상'],
    rate: 3.0,
    limitAmount: 100_000_000,
    deadline: '2026-10-31',
    judgement: 'possible',
    bookmarked: false,
    description: '업력 3년 이상 성장 단계 소상공인의 운전자금을 지원해요.',
    repayment: '거치 2년· 원리금 균등 3년',
    minMonths: 36,
    target: '업력 3년 이상 소상공인',
    creditScore: '800점 이상',
    execution: '승인 시 출금 계좌로 입금',
  },
  {
    id: 'ln-4',
    name: '스마트공방 기술향상자금',
    agency: '중소벤처기업진흥공단',
    tags: ['시설자금', '도입 계획서 필요'],
    rate: 2.8,
    limitAmount: 50_000_000,
    deadline: '2026-11-14',
    judgement: 'impossible',
    bookmarked: false,
    description: '소공인의 스마트 설비 도입을 위한 시설자금이에요.',
    repayment: '거치 3년· 원리금 균등 5년',
    minMonths: 12,
    target: '제조업 소공인',
    creditScore: '제한 없음',
    execution: '설비 계약 확인 후 지급',
  },
  {
    id: 'ln-5',
    name: '청년고용연계자금',
    agency: '중소벤처기업진흥공단',
    tags: ['운전자금', '만 39세 이하'],
    rate: 2.5,
    limitAmount: 100_000_000,
    deadline: '2026-10-15',
    judgement: 'impossible',
    bookmarked: false,
    description: '청년 대표 또는 청년 고용 소상공인의 운전자금을 지원해요.',
    repayment: '거치 2년· 원리금 균등 3년',
    minMonths: 6,
    target: '만 39세 이하 대표',
    creditScore: '제한 없음',
    execution: '승인 시 출금 계좌로 입금',
  },
]

export interface DashboardProduct {
  id: string
  /** 줄바꿈은 \n */
  name: string
  tags: string[]
  metricLabel: string
  metricValue: string
  bookmarked: boolean
}

/** 대시보드 "지원 가능한 대출" 카로셀 */
export const mockDashboardLoans: DashboardProduct[] = [
  { id: 'ln-2', name: '지역신보\n보증부 대출', tags: ['운전자금', '보증서 필요'], metricLabel: '금리', metricValue: '연 4.1%', bookmarked: true },
  { id: 'ln-3', name: '소상공인\n성장촉진자금', tags: ['운전자금', '업력 3년 이상'], metricLabel: '금리', metricValue: '연 3.0%', bookmarked: false },
  { id: 'ln-6', name: '소상공인\n재도전 특별자금', tags: ['운전자금', '상시 접수'], metricLabel: '금리', metricValue: '연 3.2%', bookmarked: false },
  { id: 'ln-10', name: '소진공\n소상공인 특별경영안정자금', tags: ['운전자금', '재해 피해'], metricLabel: '금리', metricValue: '연 2.9%', bookmarked: false },
  { id: 'ln-11', name: '대구은행\n소상공인 이자 지원 대출', tags: ['운전자금', '대구 소재'], metricLabel: '금리', metricValue: '연 3.5%', bookmarked: false },
  { id: 'ln-12', name: '기업은행\n소상공인 희망 대출', tags: ['운전자금', '무담보'], metricLabel: '금리', metricValue: '연 3.8%', bookmarked: false },
  { id: 'ln-13', name: '신용보증기금\n햇살론 사업자', tags: ['운전자금', '보증서 필요'], metricLabel: '금리', metricValue: '연 4.3%', bookmarked: false },
  { id: 'ln-14', name: '소진공\n스마트상점 시설자금', tags: ['시설자금', '~ 10. 20'], metricLabel: '금리', metricValue: '연 2.7%', bookmarked: false },
]

export const mockPreDashboardLoans: DashboardProduct[] = [
  { id: 'ln-7', name: '소진공\n창업기반자금', tags: ['운전자금', '업력 1년 미만'], metricLabel: '금리', metricValue: '연 3.0%', bookmarked: true },
  { id: 'ln-8', name: '창업초기\n보증부 대출', tags: ['운전자금', '보증서 필요'], metricLabel: '금리', metricValue: '연 3.8%', bookmarked: false },
  { id: 'ln-9', name: '신사업창업사관학교\n연계자금', tags: ['시설자금', '교육 수료 필요'], metricLabel: '금리', metricValue: '연 2.0%', bookmarked: false },
  { id: 'ln-15', name: '청년전용\n창업자금', tags: ['운전자금', '만 39세 이하'], metricLabel: '금리', metricValue: '연 2.5%', bookmarked: false },
  { id: 'ln-16', name: '대구광역시\n예비창업자 특별자금', tags: ['시설자금', '대구 소재'], metricLabel: '금리', metricValue: '연 2.3%', bookmarked: false },
  { id: 'ln-17', name: '소진공\n재창업 지원자금', tags: ['운전자금', '재창업'], metricLabel: '금리', metricValue: '연 3.1%', bookmarked: false },
]
