import {
  FAVORITE_KIND,
  type FavoriteItem,
  type FavoriteLoan,
  type FavoriteSupportProgram,
} from '@/features/mypage/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { PRODUCT_STATUS, type ProductStatus } from '@/shared/constants/productStatus'
import type { ISODate } from '@/shared/types'

/**
 * `GET /bookmark/me` 의 대출 한 건. 백엔드 `bookmark/dto/LoanList` 와 1:1.
 *
 * 대출 목록(`GET /loan`)의 `LoanListItem` 과 다르다 — 이쪽은 `minLoanBalance` ·
 * `period` 가 더 오고 `bookmarked` 가 없다. 관심 목록에 실린 것은 전부 담긴
 * 상태라 서버가 굳이 안 보낸다.
 */
interface BookmarkLoanResponse {
  loanId: number
  /** ⚠️ 상품명이다. 컬럼명이 account_name 이라 계좌명으로 읽히기 쉽다 */
  accountName: string
  bankName: string
  interestRate: number
  maxLoanBalance: number
  minLoanBalance: number
  /** 대출 기간(개월) */
  period: number
  status: string
}

/** `GET /bookmark/me` 의 지원사업 한 건. 백엔드 `bookmark/dto/SupportProgramList` 와 1:1 */
interface BookmarkSupportProgramResponse {
  supportProgramId: number
  /** 공고명 */
  pblancNm: string
  /** 소관기관명 */
  jrsdInsttNm: string
  minBalance: number | null
  maxBalance: number | null
  endDate: ISODate | null
  /** ⚠️ 이름이 `interestRate` 가 아니다. 융자형 공고에만 값이 있고 나머지는 null */
  interestRateOfSP: number | null
  status: string
}

interface BookmarkListResponse {
  loanList: BookmarkLoanResponse[]
  supportProgramList: BookmarkSupportProgramResponse[]
}

/**
 * 관심 목록의 status 를 화면이 쓰는 `ProductStatus` 로 맞춘다.
 *
 * ⚠️ 이 API 만 값이 다르다. 백엔드 `LoanStatus` enum 은 `ELIGIBLE` · `INELIGIBLE` 인데
 *    `BookmarkServiceImpl` 만 enum 을 안 쓰고 `"POSSIBLE"` · `"IMPOSSIBLE"` 문자열을
 *    직접 박아 뒀다. `/loan` · `/support` 목록은 enum 그대로 주므로 프론트 상수를
 *    바꾸면 그쪽이 깨진다 — 그래서 여기서만 되돌린다.
 *
 *    백엔드가 `LoanStatus` 를 쓰도록 고치면 이 매핑 테이블을 지우면 된다.
 */
const STATUS_ALIAS: Record<string, ProductStatus> = {
  POSSIBLE: PRODUCT_STATUS.ELIGIBLE,
  IMPOSSIBLE: PRODUCT_STATUS.INELIGIBLE,
}

/**
 * 서버가 준 status 문자열을 `ProductStatus` 로 좁힌다.
 *
 * 신청이 있는 항목은 `application.status` 가 그대로 실려 온다. 대부분 `ProductStatus`
 * 와 같은 값이지만 `REJECTED` 는 프론트에 없다 — 반려는 재신청할 수 있어서 배지로
 * 쓰지 않기로 했고(`productStatus.ts`), `/loan` 쪽은 서버가 `LoanStatus.of` 에서
 * 판정 결과로 되돌려 준다. 관심 목록은 그 처리를 안 하고 보내므로 여기서 받는다.
 *
 * 모르는 값은 `ELIGIBLE` 로 둔다. 판정을 다시 할 근거가 응답에 없는데, 눌러볼 수 있는
 * 쪽이 덜 위험하다 — 상세 모달이 제 상태를 다시 받아오므로 잘못된 '가능' 은 한 번
 * 열어보면 바로잡히지만, 잘못된 '불가' 는 흐리게 깔려서 아예 안 눌러보게 된다.
 */
function toProductStatus(raw: string): ProductStatus {
  if (raw in STATUS_ALIAS) return STATUS_ALIAS[raw]
  if (raw in PRODUCT_STATUS) return raw as ProductStatus

  return PRODUCT_STATUS.ELIGIBLE
}

function toFavoriteLoan(loan: BookmarkLoanResponse): FavoriteLoan {
  return {
    kind: FAVORITE_KIND.LOAN,
    id: loan.loanId,
    title: loan.accountName,
    organization: loan.bankName,
    status: toProductStatus(loan.status),
    interestRate: loan.interestRate,
    maxLoanBalance: loan.maxLoanBalance,
    period: loan.period,
  }
}

function toFavoriteSupportProgram(program: BookmarkSupportProgramResponse): FavoriteSupportProgram {
  return {
    kind: FAVORITE_KIND.SUPPORT,
    id: program.supportProgramId,
    title: program.pblancNm,
    organization: program.jrsdInsttNm,
    status: toProductStatus(program.status),
    maxBalance: program.maxBalance,
    endDate: program.endDate,
    interestRate: program.interestRateOfSP,
  }
}

/**
 * 내 관심 목록.
 *
 * 서버는 대출과 지원사업을 두 배열로 나눠 주는데 화면은 한 표에 섞어 그린다. 그래서
 * 여기서 합쳐 `FavoriteItem[]` 하나로 만든다 — 화면이 두 배열을 들고 있으면 유형
 * 필터·개수 세기·정렬을 전부 두 번씩 써야 한다.
 *
 * ⚠️ 정렬 기준이 없다. 서버가 `bookmark` 행 순서대로 주고 정렬 파라미터도 안 받는데,
 *    합치고 나면 대출이 먼저 오고 지원사업이 뒤에 오는 모양이 된다. 담은 순서대로
 *    보고 싶다면 응답에 createdAt 이 필요하다 — 지금은 안 온다.
 */
export async function getBookmarks(): Promise<FavoriteItem[]> {
  const { data } = await api.get<BookmarkListResponse>(endpoints.bookmark.me)

  /*
   * 두 배열 중 하나가 통째로 빠져 올 수 있다. 백엔드가 빈 리스트를 보내긴 하지만
   * 응답 모양이 바뀌면 여기서 바로 터지는 것보다 빈 목록으로 보이는 편이 낫다.
   */
  const loans = data.loanList ?? []
  const programs = data.supportProgramList ?? []

  return [...loans.map(toFavoriteLoan), ...programs.map(toFavoriteSupportProgram)]
}
