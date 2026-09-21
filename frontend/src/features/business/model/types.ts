/**
 * `GET /business/me` 응답. 백엔드 `BusinessInfoResponse` 와 1:1 이다.
 *
 * ⚠️ `name` 은 대표자명이 아니다. 백엔드가 `businessName` 을 한 번 더 넣고 있어서
 *    (`BusinessInfoResponse.from`) 상호명과 같은 값이 온다. 화면은 `businessName` 만 쓴다.
 * ⚠️ 사업자등록번호 필드명이 `brn` 이 아니라 `bsn` 이다 — 다른 API 와 다르다.
 * ⚠️ `region` 필드가 없다. `business_info.region` 컬럼은 있지만 응답에 안 실어서
 *    지역은 `address` 에서 잘라 쓴다 (`toRegionLabel`).
 */
export interface BusinessMeResponse {
  /** 상호명. 예: '맛있는 한상' */
  businessName: string
  /** 사업자등록번호. 하이픈 없는 10자리 */
  bsn: string
  /** 백엔드가 `businessName` 을 그대로 넣는다. 쓰지 않는다 */
  name: string
  /** 업종 소분류명(`minor_code.name`). 예: '한식음식점' */
  businessType: string
  /** 전체 주소. 예: '서울특별시 강남구 테헤란로 123' */
  address: string
  /** 'YYYY-MM-DD' */
  openDate: string
}

/**
 * 사이드바 하단 카드가 쓰는 업체 요약. `BusinessMeResponse` 를 화면에 맞게 줄인 값이다.
 *
 * 응답을 그대로 넘기지 않는 이유는 `region` 이 응답에 없어서다. 주소를 자르는 규칙이
 * 컴포넌트마다 흩어지지 않게 api 계층에서 한 번만 변환한다.
 *
 * 로그인 상태면 role 과 무관하게 부른다. 예비 창업자는 `business_info` 가 없어 404 를
 * 받고 사이드바 카드도 안 그려지는데, role 로 끄지 않는 이유는 토큰의 role 이 DB 와
 * 어긋나는 구간 때문이다 — `useBusinessSummary` 주석 참고.
 */
export interface BusinessSummary {
  /** 상호명. 예: '맛있는 한상' */
  name: string
  /** 시·도 약칭 + 시·군·구. 예: '서울 강남구' */
  region: string
  /** 업종 소분류명. 예: '한식음식점' */
  industryName: string
}
