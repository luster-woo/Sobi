import type { MarketAnalysis, MarketCondition } from '@/shared/types'

export const defaultMarketCondition: MarketCondition = {
  large: '외식업',
  mid: '한식 음식점업',
  small: '백반·한정식',
  region: '대구광역시 북구',
  size: '15평',
  budget: '5,000만 원',
}

export const mockMarketAnalysis: MarketAnalysis = {
  condition: defaultMarketCondition,
  sameCount: 27,
  footTraffic: '1.2만 명',
  avgRent: '180만 원',
  avgSales: '2,900만 원',
  density: {
    regionAvg: 15,
    here: 27,
    comment: '경쟁 밀집도가 높은 상권이에요. 인근 복현동은 동종업종이 11곳으로 밀집도가 낮습니다.',
  },
  composition: [
    { name: '한식 음식점', count: 27, ratio: 31 },
    { name: '카페·디저트', count: 19, ratio: 22 },
    { name: '주점·호프', count: 14, ratio: 16 },
    { name: '기타', count: 27, ratio: 31 },
  ],
  nearby: [
    { dong: '산격동', count: 27, traffic: '1.2만 명', rent: '180만 원', sales: '2,900만 원' },
    { dong: '복현동', count: 11, traffic: '0.8만 명', rent: '140만 원', sales: '2,600만 원' },
    { dong: '대현동', count: 19, traffic: '1.5만 명', rent: '210만 원', sales: '3,200만 원' },
  ],
  breakEven: '1,950만 원',
}

export const businessCodes = {
  large: ['외식업', '도소매업', '서비스업'],
  mid: ['한식 음식점업', '중식 음식점업', '카페·디저트'],
  small: ['백반·한정식', '국수·면류', '고기 구이'],
  regions: ['대구광역시 북구', '대구광역시 중구', '대구광역시 수성구', '대구광역시 달서구'],
}
