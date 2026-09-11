import type { ID } from '@/shared/types'

/**
 * 예비창업자 조건 입력에 쓰는 선택지.
 *
 * ⚠️ 하드코딩이다. 업종은 `major_code` → `sub_code` → `minor_code` 3단 테이블에 있고
 *    (shared/types/code.ts) 서버가 내려줘야 한다. 코드 목록 API 가 명세에 아직 없다.
 *
 * ⚠️ 서버로 보내는 값은 **소분류 id** 다. `pre_business_info.code_id` 가 minor_code 를
 *    가리킨다. 대·중분류는 고르기 위한 단계일 뿐 저장되지 않는다.
 */

export interface IndustryNode {
  id: ID
  name: string
}

export interface IndustrySub extends IndustryNode {
  minors: IndustryNode[]
}

export interface IndustryMajor extends IndustryNode {
  subs: IndustrySub[]
}

export const INDUSTRY_TREE: readonly IndustryMajor[] = [
  {
    id: 1,
    name: '외식업',
    subs: [
      {
        id: 11,
        name: '한식 음식점업',
        minors: [
          { id: 111, name: '백반·한정식' },
          { id: 112, name: '국수·냉면' },
          { id: 113, name: '고기구이' },
        ],
      },
      {
        id: 12,
        name: '커피·음료',
        minors: [
          { id: 121, name: '카페' },
          { id: 122, name: '주스·차 전문점' },
        ],
      },
      {
        id: 13,
        name: '분식·간이음식',
        minors: [
          { id: 131, name: '김밥·분식' },
          { id: 132, name: '치킨' },
        ],
      },
    ],
  },
  {
    id: 2,
    name: '도소매업',
    subs: [
      {
        id: 21,
        name: '편의점·식료품',
        minors: [
          { id: 211, name: '편의점' },
          { id: 212, name: '식료품 소매' },
        ],
      },
      {
        id: 22,
        name: '의류·잡화',
        minors: [
          { id: 221, name: '의류 소매' },
          { id: 222, name: '화장품 소매' },
        ],
      },
    ],
  },
  {
    id: 3,
    name: '서비스업',
    subs: [
      {
        id: 31,
        name: '미용·뷰티',
        minors: [
          { id: 311, name: '헤어숍' },
          { id: 312, name: '네일·속눈썹' },
        ],
      },
      {
        id: 32,
        name: '교육·학원',
        minors: [
          { id: 321, name: '보습학원' },
          { id: 322, name: '예체능학원' },
        ],
      },
    ],
  },
]

/**
 * 지역 선택지 — 시·도 → 시·군·구 → 읍·면·동 3단.
 *
 * `V7__drop_region.sql` 이 `seoul_commercial_data` 에 district_code·district_name·
 * dong_code·dong_name 을 더한 것과 같은 층위다. 상권 분석이 동 단위로 돌아간다.
 *
 * ⚠️ 하드코딩이고 일부만 담았다. 실제로는 코드 목록 API 로 받아야 한다.
 *
 * ⚠️ 상권 데이터 테이블 이름이 `seoul_commercial_data` 라 서울만 분석될 수 있다.
 *    대구를 같이 둔 것은 나머지 목이 대구 기준이라서다 — 어느 지역이 실제로
 *    지원되는지 백엔드 확인 필요.
 */

export interface RegionDistrict {
  name: string
  dongs: readonly string[]
}

export interface RegionProvince {
  name: string
  districts: readonly RegionDistrict[]
}

export const REGION_TREE: readonly RegionProvince[] = [
  {
    name: '서울특별시',
    districts: [
      { name: '강남구', dongs: ['역삼동', '삼성동', '논현동', '청담동'] },
      { name: '마포구', dongs: ['서교동', '연남동', '합정동', '망원동'] },
      { name: '성동구', dongs: ['성수동1가', '성수동2가', '행당동'] },
    ],
  },
  {
    name: '대구광역시',
    districts: [
      { name: '북구', dongs: ['산격동', '복현동', '침산동', '태전동'] },
      { name: '중구', dongs: ['동인동', '삼덕동', '남산동'] },
      { name: '수성구', dongs: ['범어동', '만촌동', '지산동'] },
      { name: '달서구', dongs: ['월성동', '상인동', '이곡동'] },
    ],
  },
]
