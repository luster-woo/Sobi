import type { ProductStatus } from '@/shared/constants/productStatus'
import type { ISODate, PageMeta, SupportProgramType } from '@/shared/types'

/**
 * 유형 표시 문구. 값 정의는 shared/types/supportProgram.ts 에 있다.
 *
 * 값은 서버 계약이라 shared 에 두고 문구는 여기 남긴다. 같은 값에 화면마다 다른 문구를
 * 붙일 수 있어서다 — APPROVED 를 대출은 '승인', 지원사업은 '선정' 으로 갈랐던 것처럼.
 */
export const SUPPORT_PROGRAM_TYPE_LABEL: Record<SupportProgramType, string> = {
  SUPPORT: '지원금',
  LOAN: '대출',
  ETC: '기타',
}

interface SupportProgramBase {
  supportProgramId: number
  /** 지원사업명 */
  pblancNm: string
  /** 소관기관명 */
  jrsdInsttNm: string
  /** 수행기관명 */
  excInsttNm: string
  /** 둘 다 null 이면 '상시' 로 표시한다 */
  startDate: ISODate | null
  endDate: ISODate | null
  status: ProductStatus
  isBookmark: boolean
}

/** 원 단위 금액. 지원금·대출에만 온다 */
interface WithBalance {
  minBalance: number
  maxBalance: number
}

/**
 * 목록의 한 행.
 *
 * type 에 따라 오는 필드가 달라서 판별 유니온으로 둔다. 전부 optional 로 두면
 * `program.interestRate ?? 0` 같은 방어 코드가 화면에 퍼지고, ETC 행에 금리를 실수로
 * 그려도 타입이 잡아주지 않는다.
 *
 *   if (program.type === 'LOAN') program.interestRate  // ✅
 *   program.interestRate                               // ❌ 컴파일 에러
 */
export type SupportProgramListItem =
  | (SupportProgramBase & WithBalance & { type: 'SUPPORT' })
  | (SupportProgramBase & WithBalance & { type: 'LOAN'; interestRate: number })
  | (SupportProgramBase & { type: 'ETC' })

export interface SupportProgramListData {
  programs: SupportProgramListItem[]
  page: PageMeta
}

/** 목록 조회 쿼리. undefined 인 필터는 axios 가 알아서 빼고 보낸다 */
export interface SupportProgramListParams {
  /** 0-base. 화면의 1-base 를 toServerPage 로 변환해서 넣는다 */
  page: number
  size: number
  /**
   * 지원 유형 필터.
   * ⚠️ 명세 파라미터 목록에는 없다. 화면에 유형 필터가 있어 'type' 으로 가정했다 —
   *    이름이 확정되면 여기와 SupportFilterBar 만 고치면 된다.
   */
  type?: SupportProgramType
  /** 소관기관명 */
  jrsdInsttNm?: string
  /** 판정 결과. status 7종 중 하나를 보낸다 */
  judgement?: ProductStatus
  isBookmark?: boolean
  sort?: string
}

/**
 * 자연어 검색 파라미터.
 *
 * page·size 는 쿼리스트링, query 는 본문으로 간다. 목록 조회와 달리 필터를 받지 않는다 —
 * 자연어 질의 자체가 조건을 포함한다고 보기 때문이다.
 */
export interface SupportProgramSearchParams {
  /** 0-base */
  page: number
  size: number
  /** 자연어 질의. '키오스크 사려는데 관련된 지원금 좀 찾아줘' */
  query: string
}

/**
 * 지원사업 상세.
 *
 * 목록과 겹치는 필드가 있지만 상속하지 않는다. 상세에는 supportProgramId 가 없고
 * (경로 파라미터로 넘긴 값이라 응답에 다시 오지 않는다) 대신 사업 개요·신청 방법·
 * 문의처가 붙는다.
 */
interface SupportProgramDetailBase {
  pblancNm: string
  /** 사업 개요 */
  bsnsSumryCn: string | null
  jrsdInsttNm: string
  excInsttNm: string
  startDate: ISODate | null
  endDate: ISODate | null
  status: ProductStatus
  isBookmark: boolean
  /** 신청 방법 */
  reqstMthPapersCn: string | null
  /** 문의처 */
  refrncNm: string | null
}

export type SupportProgramDetail =
  | (SupportProgramDetailBase & WithBalance & { type: 'SUPPORT' })
  | (SupportProgramDetailBase & WithBalance & { type: 'LOAN'; interestRate: number })
  | (SupportProgramDetailBase & { type: 'ETC' })
