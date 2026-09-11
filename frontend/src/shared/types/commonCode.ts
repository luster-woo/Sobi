/**
 * 업종·지역 코드 목록.
 *
 * `GET /common/market/businesses` · `GET /common/market/regions` 의 응답 타입이다.
 * 둘 다 트리 하나로 통째로 온다 — 단계마다 서버를 부르지 않고 받아둔 트리에서 하위를
 * 꺼내 쓰므로, 셀렉트를 바꿀 때 로딩이 뜨지 않는다. 정적 데이터라 캐시도 사실상 영구다.
 *
 * 코드 체계는 서울시 공공데이터 업종 분류를 따른다. 상권 분석에 보내는 값은 소분류의
 * code(CS100001)와 행정동의 code(11440375) 둘뿐이고, 상위 코드는 화면에서 하위를
 * 좁히는 데만 쓴다.
 *
 * shared 에 두는 이유: 상권 분석 조건 모달과 예비창업자 대시보드의 창업 조건 패널이
 * 같은 목록을 쓴다. feature 끼리 import 하지 않기로 해서 공용 자리로 올렸다.
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
