import {
  FAVORITE_KIND,
  type FavoriteItem,
  type FavoriteLoan,
  type FavoriteSupportProgram,
} from '@/features/mypage/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import { SUPPORT_STATUS, type SupportStatus } from '@/shared/constants/productStatus'
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
  /** ⚠️ 대출 기간(**일**). 개월이 아니다 — 백엔드 `LoanDetailResponse` 가 '대출 기간(일)' 이다 */
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
 * 서버가 준 status 문자열을 `SupportStatus` 로 좁힌다.
 *
 * `BookmarkServiceImpl` 이 `LoanStatus.of(...).name()` · `SupportStatus.of(...).name()` 을
 * 실어 주므로 값은 `/loan` · `/support` 목록과 같다 — 한동안 이 API 만 `POSSIBLE` ·
 * `IMPOSSIBLE` 을 준다고 보고 되돌리는 표를 뒀었는데, 백엔드가 enum 을 쓰도록 고쳐서
 * 그 표는 지웠다.
 *
 * 모르는 값은 `ELIGIBLE` 로 둔다. 판정을 다시 할 근거가 응답에 없는데, 눌러볼 수 있는
 * 쪽이 덜 위험하다 — 상세 모달이 제 상태를 다시 받아오므로 잘못된 '가능' 은 한 번
 * 열어보면 바로잡히지만, 잘못된 '불가' 는 흐리게 깔려서 아예 안 눌러보게 된다.
 */
function toSupportStatus(raw: string): SupportStatus {
  if (raw in SUPPORT_STATUS) return raw as SupportStatus

  return SUPPORT_STATUS.ELIGIBLE
}

function toFavoriteLoan(loan: BookmarkLoanResponse): FavoriteLoan {
  return {
    kind: FAVORITE_KIND.LOAN,
    id: loan.loanId,
    title: loan.accountName,
    organization: loan.bankName,
    status: toSupportStatus(loan.status),
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
    status: toSupportStatus(program.status),
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
