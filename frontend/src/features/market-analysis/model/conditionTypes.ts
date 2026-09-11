/**
 * 상권 분석 조건 입력에 쓰는 목록 타입.
 *
 * 업종·지역 모두 트리 하나로 통째로 온다. 단계마다 서버를 부르지 않고 받아둔 트리에서
 * 하위를 꺼내 쓴다 — 셀렉트를 바꿀 때마다 로딩이 뜨지 않고, 정적 데이터라 캐시가
 * 사실상 영구다.
 *
 * 코드 체계는 서울시 공공데이터 업종 분류를 따른다. market 에 보내는 값은 소분류의
 * code(CS100001)와 행정동의 code(11440375) 둘뿐이고, 상위 코드는 화면에서 하위를
 * 좁히는 데만 쓴다.
 */

export interface CodeItem {
  code: string
  name: string
}

// ---------- 업종 ----------

export interface BusinessSub extends CodeItem {
  minors: CodeItem[]
}

export interface BusinessMajor extends CodeItem {
  subs: BusinessSub[]
}

export interface BusinessTree {
  majors: BusinessMajor[]
}

// ---------- 지역 ----------

export interface RegionDistrict extends CodeItem {
  dongs: CodeItem[]
}

export interface RegionTree {
  /** '서울특별시'. 지금은 서울 데이터만 있어 시·도 선택지가 하나다 */
  cityName: string
  districts: RegionDistrict[]
}

/**
 * 조건 입력 모달이 들고 있는 값.
 *
 * 대분류·중분류·자치구는 하위 목록을 좁히는 용도라 서버로 가지 않는다. 실제로
 * market 에 보내는 건 minorCode 와 dongCode 뿐이다.
 *
 * 시안에 있던 규모(평)·예산은 받지 않는다. 규모는 임대료 추정에, 예산은 자금 추천에
 * 쓰려던 값인데 임대료 데이터가 빠졌고 백엔드에서도 두 값이 제외됐다.
 */
export interface MarketCondition {
  majorCode: string
  subCode: string
  /** market 의 businessCode */
  minorCode: string
  districtCode: string
  /** market 의 dongCode */
  dongCode: string
}
