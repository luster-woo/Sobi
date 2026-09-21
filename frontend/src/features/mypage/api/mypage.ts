import type { MyPageData } from '@/features/mypage/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { AuthProvider, ISODate, ISODateTime, UserRole } from '@/shared/types'
import { AUTH_PROVIDER, USER_ROLE } from '@/shared/types'

/**
 * `GET /user/mypage` 응답. 백엔드 `MyPageResponse` 와 1:1 이다.
 *
 * `GET /user/me` 와 다른 엔드포인트다. 저쪽은 세션 복구용이라 여섯 필드뿐이고,
 * 이쪽은 사업자 정보·마이데이터·계좌 요약을 한 번에 모아 준다.
 *
 * ⚠️ 잔액은 DB 에 없다. 서버가 **조회 시점에 금융망에서 받아온다**(`UserServiceImpl`).
 *    그래서 이 요청만 1~2초 더 걸리고, 금융망이 실패하면 예외 대신 **전부 0** 이 온다.
 *    0 원과 '못 불러옴' 이 응답에서 구분되지 않는다.
 */
interface BusinessSummaryResponse {
  businessName: string
  /** 하이픈 포함 '123-45-67890' */
  brn: string
  /** `business_info` 에 대표자명이 없어 서버가 `users.name` 을 넣는다 */
  ownerName: string
  industryName: string
  address: string
  openDate: ISODate
}

/**
 * ⚠️ null 이 아니다. 연동 여부는 `linked` 로 판단한다.
 *
 * ⚠️ `linked` 는 이름과 달리 **지원사업 판정 이력이 있는지**다
 *    (`UserServiceImpl.toMyDataStatus` → `findLastJudgedAt(business.id) != null`).
 *    연동과 판정이 `MydataServiceImpl.link()` 한 흐름이라 마이데이터 쪽 표시로는
 *    쓸 수 있지만, **계좌와는 무관하다** — 계좌 요약은 판정과 상관없이 매 요청
 *    금융망에서 실시간으로 받아온다.
 */
interface MyDataStatusResponse {
  linked: boolean
  /** 마지막 판정 시각. 판정한 적이 없으면 null */
  updatedAt: ISODateTime | null
}

/** ⚠️ 이것도 null 이 아니다. 금융망 실패·계좌 없음이면 전부 0 */
interface AccountSummaryResponse {
  totalBalance: number
  totalLoanBalance: number
  /** 입출금 + 대출 계좌 수 */
  accountCount: number
  /** 입출금 계좌의 은행 수. 한 은행에 계좌가 둘이면 1 이다 */
  institutionCount: number
}

/** 가장 최근 대출의 출금 계좌. 대출이 없거나 그 계좌를 못 찾으면 null */
interface PayoutAccountResponse {
  bankName: string
  accountNo: string
}

interface MyPageResponse {
  userId: number
  name: string
  email: string
  birthDate: ISODate | null
  role: string
  provider: string
  notification: boolean
  /** 예비창업자면 null */
  business: BusinessSummaryResponse | null
  myData: MyDataStatusResponse
  accountSummary: AccountSummaryResponse
  payoutAccount: PayoutAccountResponse | null
}

/**
 * role 문자열을 좁힌다.
 *
 * 모르는 값이 오면 예비창업자로 본다 — `isPreOwner` 와 같은 판단이다(사업자가 아니면
 * 전부 예비창업자). 백엔드 `Role` 은 nullable 이라 실제로 null 이 올 수 있다.
 */
function toUserRole(raw: string | null): UserRole {
  return raw === USER_ROLE.ENTREPRENEUR ? USER_ROLE.ENTREPRENEUR : USER_ROLE.PREENTREPRENEUR
}

/** 모르는 값은 LOCAL 로 본다. 소셜 가입자에게 비밀번호 변경을 열어주면 AUTH_017 로 막힌다 */
function toProvider(raw: string | null): AuthProvider {
  return raw === AUTH_PROVIDER.GOOGLE ? AUTH_PROVIDER.GOOGLE : AUTH_PROVIDER.LOCAL
}

/**
 * 마이페이지 조회.
 *
 * 응답이 이미 화면에 가까운 모양이라 이름만 맞춘다. '없음' 을 `null` 로 좁히는 것이
 * 실질적인 변환이다 — 서버는 `myData` · `accountSummary` 를 항상 객체로 주고
 * 없음을 0 으로 표현하는데, 화면에서는 '없음' 과 '0원' 을 갈라야 한다.
 *
 * ⚠️ 계좌 요약을 `myData.linked` 로 가리지 않는다. 그 값은 판정 이력 유무라서,
 *    판정 전이거나 예비창업자면 서버가 실제로 내려준 잔액·계좌 수가 통째로 버려진다.
 *    계좌가 있는지는 `accountCount` 가 답한다.
 */
export async function getMyPage(): Promise<MyPageData> {
  const { data } = await api.get<MyPageResponse>(endpoints.user.mypage)

  return {
    profile: {
      name: data.name,
      email: data.email,
      role: toUserRole(data.role),
      provider: toProvider(data.provider),
    },
    business: data.business,
    myData: data.myData.linked ? { linkedAt: data.myData.updatedAt } : null,
    accountSummary: data.accountSummary.accountCount > 0 ? data.accountSummary : null,
    payoutAccount: data.payoutAccount,
    notification: data.notification,
  }
}
