/**
 * 사이드바 하단 카드가 쓰는 업체 요약.
 *
 * `shared/types/business.ts` 의 `BusinessInfo` 를 그대로 쓰지 않는 이유는 두 가지다.
 * 하나는 사이드바에 상호·지역·업종명만 필요한데 `BusinessInfo` 는 사업자등록번호·주소
 * 같은 걸 다 들고 있다는 점, 다른 하나는 `businessCodeId` 가 코드 id 라서 화면에
 * 그대로 못 쓴다는 점이다. 업종명을 얻으려고 코드 테이블을 한 번 더 조회하는 대신
 * 서버가 이름까지 내려주는 요약 응답을 받는다.
 *
 * 창업자(OWNER)만 쓴다. 예비 창업자는 `business_info` 자체가 없어 이 요약을 호출하지
 * 않는다 — 사이드바 카드도 그리지 않는다.
 *
 * TODO(백엔드 명세): ERD 의 `business_info` 에는 상호명 컬럼이 없다. 지금은
 * `BusinessVerification.name`(대표자명)과 별개인 상호명이 내려온다고 가정하고 있으니,
 * 명세가 확정되면 이 필드부터 맞춰야 한다.
 */
export interface BusinessSummary {
  /** 상호명. 예: '한상차림' */
  name: string
  /** 광역 지역명. 예: '대구' */
  region: string
  /** 업종 소분류명. 예: '한식 음식점업' */
  industryName: string
}
