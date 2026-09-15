import type { BusinessMeResponse, BusinessSummary } from '@/features/business/model/types'

/**
 * 시·도 정식 명칭 → 사이드바용 약칭.
 *
 * 224px 카드에 '서울특별시 강남구·한식음식점' 을 넣으면 업종명이 잘린다. 지금 데이터는
 * 서울뿐이지만 국세청 주소는 전국이 올 수 있어 17개 시·도를 다 둔다. 전북·강원은
 * 특별자치도 전환 전 이름으로 적힌 주소도 있어 옛 이름까지 받는다.
 */
const PROVINCE_SHORT_NAME: Record<string, string> = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원특별자치도: '강원',
  강원도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라북도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
}

/**
 * 전체 주소에서 '시·도 약칭 + 시·군·구' 를 뽑는다.
 *
 *   '서울특별시 강남구 테헤란로 123' → '서울 강남구'
 *   '세종특별자치시 한누리대로 2130' → '세종'  (세종은 시·군·구가 없다)
 *
 * 두 번째 토큰은 시·군·구로 끝날 때만 붙인다. 세종처럼 바로 도로명이 오는 주소에서
 * '세종 한누리대로' 가 되지 않게 하려는 것이다. 약칭표에 없는 시·도는 원문을 그대로 쓴다.
 */
export function toRegionLabel(address: string): string {
  const [province = '', district] = address.trim().split(/\s+/)
  const shortProvince = PROVINCE_SHORT_NAME[province] ?? province

  if (district && /[시군구]$/.test(district)) return `${shortProvince} ${district}`

  return shortProvince
}

export function toBusinessSummary(raw: BusinessMeResponse): BusinessSummary {
  return {
    name: raw.businessName,
    region: toRegionLabel(raw.address),
    industryName: raw.businessType,
  }
}
