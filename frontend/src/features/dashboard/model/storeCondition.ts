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
 * 지역 선택지.
 *
 * ⚠️ 시안과 기존 목이 대구 기준이라 대구 구·군으로 뒀다. 그런데 상권 데이터 테이블이
 *    `seoul_commercial_data` 라 분석이 서울만 된다면 이 목록을 서울 자치구로 갈아야
 *    한다 — 백엔드 확인 필요.
 */
export const REGIONS: readonly string[] = [
  '대구광역시 중구',
  '대구광역시 동구',
  '대구광역시 서구',
  '대구광역시 남구',
  '대구광역시 북구',
  '대구광역시 수성구',
  '대구광역시 달서구',
  '대구광역시 달성군',
]
